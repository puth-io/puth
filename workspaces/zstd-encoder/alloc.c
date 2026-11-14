/*
 * A bump allocator for zstd in WebAssembly, instead of wasi-libc's dlmalloc. Memory is handed out in order and
 * starts over once nothing is allocated anymore, which is the case after every call of the wrapper: it frees its
 * buffers, and zstd frees its context and workspace. Memory grows when needed and is reused from the start.
 */
#include <stddef.h>

extern unsigned char __heap_base;

static size_t top = (size_t)&__heap_base;
static size_t live = 0;

void *malloc(size_t size) {
    size_t start = (top + 15) & ~(size_t)15;
    if (size > (size_t)-1 - start) {
        return NULL;
    }
    size_t end = start + (size ? size : 1);
    size_t available = __builtin_wasm_memory_size(0) * 65536;
    if (end > available) {
        size_t pages = (end - available + 65535) / 65536;
        if (__builtin_wasm_memory_grow(0, pages) == (size_t)-1) {
            return NULL;
        }
    }
    top = end;
    live++;
    return (void *)start;
}

void free(void *pointer) {
    if (pointer != NULL && --live == 0) {
        top = (size_t)&__heap_base;
    }
}

/* Reused memory isn't zero, so calloc clears it. */
void *calloc(size_t count, size_t size) {
    if (size != 0 && count > (size_t)-1 / size) {
        return NULL;
    }
    void *pointer = malloc(count * size);
    if (pointer != NULL) {
        __builtin_memset(pointer, 0, count * size);
    }
    return pointer;
}
