import {observer} from 'mobx-react-lite';
import {useContext, useEffect, useState} from 'react';
import {AppContext} from '../../shared/Contexts';
import {cn} from '../../lib/utils';
import ContextStore from '@/app/store/ContextStore';

// Closed sessions stay listed this long, pinned ones until the instance forgets them.
const RECENT = 10 * 60 * 1000;

function formatTook(took: {minutes: number, seconds: number}) {
    const pad = (value: number) => (value < 10 ? '0' : '') + value;
    return `${pad(took.minutes)}:${pad(took.seconds)}s`;
}

function ago(time: number, now: number) {
    const minutes = Math.round((now - time) / 60000);
    if (minutes < 1) {
        return 'just now';
    }
    return minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;
}

const AgentItem = observer(function AgentItem({context, now}: {context: ContextStore, now: number}) {
    const {app} = useContext(AppContext);
    const active = app.activeContext === context;
    const pinned = app.pinned.includes(context.id);
    // A test an agent took over keeps its own name and class.
    const handoff = ! context.isAgent;

    return (
        <li>
            <button
                type={'button'}
                {...{puth: 'agent-item'}}
                aria-current={active}
                onClick={() => app.setActive(context)}
                className={cn(
                    'flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left hover:bg-white/[0.04]',
                    active ? 'border-accent-blue/45 bg-blue-600/[0.12]' : 'border-transparent',
                )}
            >
                <span
                    aria-hidden={true}
                    className={cn(
                        'mt-[7px] h-[7px] w-[7px] flex-none rounded-full',
                        context.isLive ? 'animate-pulse bg-green-500' : 'border border-ink-muted',
                    )}
                />
                <span className={'flex min-w-0 flex-1 flex-col gap-[3px]'}>
                    <span className={'truncate text-sm text-ink'}>{context.test.name}</span>
                    <span className={'truncate font-mono text-[11.5px] text-ink-muted'}>
                        {handoff ? `handoff · ${context.group}` : `${context.toolCalls} ${context.toolCalls === 1 ? 'call' : 'calls'}`}
                        {pinned && ' · pinned'}
                    </span>
                </span>
                <span className={'flex flex-none flex-col items-end gap-[3px] font-mono text-[11.5px] text-ink-muted'}>
                    <span className={context.isLive ? 'text-green-300' : undefined}>{context.isLive ? 'live' : formatTook(context.took)}</span>
                    {! context.isLive && <span>{ago(context.lastActivity, now)}</span>}
                </span>
            </button>
        </li>
    );
});

export const AgentList = observer(function AgentList() {
    const {app} = useContext(AppContext);
    const [showOlder, setShowOlder] = useState(false);
    const [now, setNow] = useState(Date.now());

    // Ages and the cut-off for older sessions move on without new packets.
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(timer);
    }, []);

    const agents = app.agents;
    const kept = (context: ContextStore) => context.isLive
        || app.pinned.includes(context.id)
        || app.activeContext === context
        || now - context.lastActivity < RECENT;
    const visible = showOlder ? agents : agents.filter(kept);
    const older = agents.length - agents.filter(kept).length;
    const live = visible.filter(context => context.isLive);
    const closed = visible.filter(context => ! context.isLive);

    return (
        <section aria-label={'Agent sessions'} className={'flex max-h-[45vh] flex-col border-t border-shell-line'}>
            <div className={'flex min-h-[44px] flex-none items-center gap-2.5 border-b border-dashed border-neutral-800 px-4 font-mono text-xs'}>
                <span className={'text-accent-sky'}>Agent sessions</span>
                <span className={'text-ink-muted'}>{agents.length}</span>
                {app.liveAgents > 0 && <span className={'ml-auto text-green-300'}>{app.liveAgents} live</span>}
            </div>
            <ul className={'flex min-h-0 flex-col gap-0.5 overflow-y-auto px-2 pb-2.5 pt-1.5'}>
                {agents.length === 0 && (
                    <li className={'px-2.5 py-3.5 text-[13px] leading-relaxed text-ink-muted'}>
                        No agent sessions yet. Agents connected through the Puth MCP server show up here while they work.{' '}
                        <a href={'https://puth.io/guide/mcp'} target={'_blank'} rel={'noreferrer'} className={'text-accent-sky hover:text-blue-200'}>Set up the MCP server</a>
                    </li>
                )}
                {live.map(context => <AgentItem key={context.id} context={context} now={now}/>)}
                {closed.length > 0 && live.length > 0 && (
                    <li aria-hidden={true} className={'mx-2.5 my-1 border-t border-dashed border-neutral-800'}/>
                )}
                {closed.map(context => <AgentItem key={context.id} context={context} now={now}/>)}
                {older > 0 && (
                    <li>
                        <button
                            type={'button'}
                            onClick={() => setShowOlder(! showOlder)}
                            className={'w-full rounded-md px-2.5 py-2 text-left font-mono text-[11.5px] text-ink-muted hover:text-ink'}
                        >{showOlder ? 'Hide older sessions' : `Show ${older} older ${older === 1 ? 'session' : 'sessions'}`}</button>
                    </li>
                )}
            </ul>
        </section>
    );
});
