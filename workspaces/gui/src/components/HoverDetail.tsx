import {ReactNode, useEffect, useRef, useState} from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

// How long the mouse has to rest on a row before its details open.
const REST = 500;
const LEAVE_GRACE = 150;

/**
 * Shows details of a one-line row once the mouse rested on it, next to the sidebar. Moving the mouse over the
 * details keeps them open, so their text can be selected.
 */
export function HoverDetail({content, children, className}: {
    content: () => ReactNode,
    children: ReactNode,
    className?: string,
}) {
    const [open, setOpen] = useState(false);
    const rest = useRef<number>();
    const leave = useRef<number>();

    useEffect(() => () => {
        window.clearTimeout(rest.current);
        window.clearTimeout(leave.current);
    }, []);

    // Every movement restarts the wait, so only a resting mouse opens the details.
    const moved = () => {
        window.clearTimeout(leave.current);
        if (! open) {
            window.clearTimeout(rest.current);
            rest.current = window.setTimeout(() => setOpen(true), REST);
        }
    };
    const left = () => {
        window.clearTimeout(rest.current);
        leave.current = window.setTimeout(() => setOpen(false), LEAVE_GRACE);
    };
    const stay = () => window.clearTimeout(leave.current);

    return (
        <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
            <PopoverPrimitive.Anchor asChild>
                <div className={className} onMouseEnter={moved} onMouseMove={moved} onMouseLeave={left} onMouseDown={() => {
                    window.clearTimeout(rest.current);
                    setOpen(false);
                }}>
                    {children}
                </div>
            </PopoverPrimitive.Anchor>
            <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                    side={'right'}
                    align={'start'}
                    sideOffset={10}
                    collisionPadding={8}
                    onMouseEnter={stay}
                    onMouseLeave={left}
                    onOpenAutoFocus={event => event.preventDefault()}
                    onCloseAutoFocus={event => event.preventDefault()}
                    {...{puth: 'detail'}}
                    className={'z-50 w-[440px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[10px] border border-white/[0.16] bg-[#151515] text-ink shadow-[0_20px_50px_rgba(0,0,0,0.6)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0'}
                >
                    {content()}
                </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
    );
}

/**
 * The parts of a detail popover: a header line, then sections.
 */
export const DetailHeader = ({children}: {children: ReactNode}) => (
    <div className={'flex items-center gap-2 border-b border-dashed border-neutral-800 px-3.5 py-2.5 font-mono text-[11.5px]'}>{children}</div>
);

export const DetailBlock = ({label, children}: {label?: string, children: ReactNode}) => (
    <div className={'px-3.5 py-2.5'}>
        {label && <div className={'mb-1.5 font-mono text-[11px] text-ink-muted'}>{label}</div>}
        <div className={'max-h-[280px] overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink-body [overflow-wrap:anywhere]'}>{children}</div>
    </div>
);
