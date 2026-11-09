import {observer} from 'mobx-react-lite';
import {useCallback, useContext, useState} from 'react';
import {Popover, PopoverContent, PopoverTrigger} from '../../components/ui/popover.tsx';
import {Icon} from '../../components/icon.tsx';
import {AppContext} from '../../shared/Contexts.tsx';
import {cn} from '../../lib/utils';

/**
 * Address field, suggestions and the connect button. Used in the empty state and the rail.
 */
export const ConnectPanel = observer(function ConnectPanel({onConnected}: {onConnected?: () => void}) {
    const {app} = useContext(AppContext);
    const [connecting, setConnecting] = useState(false);
    const [input, setInput] = useState('');
    const [error, setError] = useState<{code: string, reason: string}|null>(null);

    const connect = useCallback((to: string) => {
        setConnecting(true);
        app.tryConnectingTo(to)
            .then(() => {
                setInput('');
                setError(null);
                onConnected?.();
            })
            .finally(() => {
                setConnecting(false);
            })
            .catch(error => setError(error));
    }, [onConnected]);

    return (
        <div className={'flex flex-col gap-3.5'}>
            <label className={'flex flex-col gap-1.5'}>
                <span className={'font-mono text-[11.5px] text-ink-muted'}>Address</span>
                <input
                    className={'h-10 w-full rounded-lg border border-shell-control bg-shell-main px-3 font-mono text-[13px] text-ink outline-none focus:border-accent-blue/50'}
                    placeholder={'ws://host:7345/websocket'}
                    onChange={event => setInput(event.target.value)}
                    onKeyDown={event => event.key === 'Enter' && input !== '' && connect(input)}
                    value={input}
                />
            </label>

            {error && (
                <div role={'alert'} className={'flex gap-2.5 rounded-lg border border-red-400/30 bg-red-500/[0.08] px-3 py-2.5'}>
                    <Icon name={'bolt'} className={'mt-0.5 flex-none text-red-300'}/>
                    <span className={'font-mono text-xs text-red-300'}>{error?.reason ?? 'Unknown error'}</span>
                </div>
            )}

            {app.connectionSuggestions.length > 0 && (
                <div className={'flex flex-col gap-1.5'}>
                    <span className={'font-mono text-[11.5px] text-ink-muted'}>Suggestions</span>
                    {app.connectionSuggestions.map((suggestion: string, idx: number) => (
                        <button
                            type={'button'}
                            key={idx}
                            disabled={connecting}
                            className={'flex min-h-[44px] w-full items-center rounded-lg border border-white/[0.12] bg-shell-main px-3 text-left font-mono text-[12.5px] text-ink hover:border-accent-blue/45 hover:bg-blue-600/10'}
                            onClick={() => connect(suggestion)}
                        >{suggestion}</button>
                    ))}
                </div>
            )}

            <div className={'flex items-center justify-end gap-3'}>
                {connecting && (
                    <span className={'flex items-center gap-2 font-mono text-xs text-ink-muted'}>
                        <Icon name={'progress_activity'} className={'animate-spin text-accent-blue'}/> Connecting
                    </span>
                )}
                <button
                    type={'button'}
                    onClick={() => connect(input)}
                    disabled={connecting || input === ''}
                    className={'inline-flex min-h-[40px] items-center gap-2 bg-blue-600 px-4 font-mono text-[13px] font-medium text-white hover:bg-blue-500 disabled:opacity-50'}
                >Connect</button>
            </div>
        </div>
    );
});

/**
 * The status dot at the bottom of the rail. It opens the connection details.
 */
export const ConnectionButton = observer(function ConnectionButton() {
    const {app} = useContext(AppContext);
    const [open, setOpen] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const connection = app.connections[0];
    const state = ! connection ? 'none' : connection.isConnected ? 'connected' : 'closed';

    const retry = async () => {
        setRetrying(true);
        await connection?.retry()
            .catch(() => {})
            .finally(() => setRetrying(false));
    };

    const label = {
        none: 'No connection',
        connected: 'Connected',
        closed: 'Connection closed',
    }[state];

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type={'button'}
                    aria-label={`${label}. Connection details`}
                    title={connection ? `${label} · ${connection.uri}` : label}
                    className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-[10px] border',
                        open ? 'border-accent-blue/35 bg-blue-600/[0.16]' : 'border-transparent hover:bg-white/[0.05]',
                    )}
                >
                    <span
                        aria-hidden={true}
                        className={cn(
                            'h-[9px] w-[9px] rounded-full',
                            state === 'connected' && 'bg-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.18)]',
                            state === 'closed' && 'bg-red-400 shadow-[0_0_0_4px_rgba(248,113,113,0.18)]',
                            state === 'none' && 'border-[1.5px] border-ink-muted',
                        )}
                    />
                </button>
            </PopoverTrigger>
            <PopoverContent
                side={'right'}
                align={'end'}
                sideOffset={10}
                className={'w-[420px] max-w-[calc(100vw-80px)] overflow-hidden rounded-xl border-white/[0.16] bg-[#151515] p-0 text-ink shadow-[0_24px_60px_rgba(0,0,0,0.65)]'}
            >
                <div className={'flex justify-between border-b border-dashed border-neutral-800 px-[18px] py-3 font-mono text-xs'}>
                    <span className={'text-accent-blue'}>Connection</span>
                    <span className={cn(state === 'connected' ? 'text-green-300' : state === 'closed' ? 'text-red-300' : 'text-ink-muted')}>{label}</span>
                </div>
                <div className={'flex flex-col gap-3.5 p-[18px]'}>
                    {connection && (
                        <div className={'flex items-center gap-3 rounded-lg border border-white/[0.12] bg-shell-main px-3 py-2.5'}>
                            <span className={'min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink-body'}>{connection.uri}</span>
                            {state === 'closed' && (
                                <button
                                    type={'button'}
                                    onClick={retry}
                                    disabled={retrying}
                                    className={'flex min-h-[30px] items-center gap-1.5 rounded-md border border-white/20 px-2.5 text-xs text-ink-body hover:bg-white/[0.08]'}
                                >
                                    <Icon name={'refresh'} className={retrying ? 'animate-spin' : ''}/> Reconnect
                                </button>
                            )}
                        </div>
                    )}
                    <div className={'text-[13px] text-ink-muted'}>{connection ? 'Switch to another instance' : 'Connect to a Puth instance'}</div>
                    <ConnectPanel onConnected={() => setOpen(false)}/>
                </div>
            </PopoverContent>
        </Popover>
    );
});
