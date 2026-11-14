import {observer} from 'mobx-react-lite';
import {runInAction} from 'mobx';
import {Fragment, Ref, useContext, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {Constructors, SnapshotState} from '@puth/core';
import {Icon, IconName} from '../../components/icon';
import {AppContext} from '../../shared/Contexts';
import {cn} from '../../lib/utils';
import {DetailBlock, DetailHeader, HoverDetail} from '../../components/HoverDetail';
import ContextStore from '@/app/store/ContextStore';

export function StatusIcon({status, className, ...rest}: any) {
    let icon: IconName = 'pending';
    if (status === 'failed') {
        icon = 'error';
        className = 'text-red-400 ' + (className ?? '');
    } else if (status === 'successful') {
        icon = 'check_circle';
        className = 'text-green-400 ' + (className ?? '');
    } else {
        className = 'text-amber-300 ' + (className ?? '');
    }

    return <Icon name={icon} className={className} {...rest}/>;
}

export function DownloadHandler({resolver, name}: any) {
    const ref = useRef<HTMLAnchorElement>(null);

    const download = async () => {
        if (! ref.current) {
            return;
        }
        let blob = await resolver();
        ref.current.href = URL.createObjectURL(blob);
        ref.current.download = name ?? 'snapshot.puth';
        ref.current.click();
        URL.revokeObjectURL(ref.current.href);
    };

    return (
        <>
            <button
                type={'button'}
                {...{puth: 'export-snapshot'}}
                aria-label={'Export snapshot'}
                title={'Export snapshot'}
                className={'flex h-8 w-8 items-center justify-center rounded-md border border-shell-control bg-shell-main text-ink-body hover:border-accent-blue/40 hover:text-ink'}
                onClick={download}
            >
                <Icon name={'download'}/>
            </button>
            <a href="" style={{display: 'none'}} ref={ref}></a>
        </>
    );
}

export function displayType(type: string) {
    if (type === Constructors.ElementHandle) {
        return 'Element';
    } else if (type === Constructors.Page) {
        return 'Page';
    } else if (type === Constructors.Browser) {
        return 'Browser';
    }
    return type;
}

export function displayArgs(args: any[]) {
    return (args ?? []).map(arg => typeof arg === 'string' ? `'${arg}'` : JSON.stringify(arg)).join(', ');
}

export function logText(log: any) {
    if (log.messageType === 'error' && (log.args ?? []).length === 0) {
        return log.text ?? '';
    }
    return (log.args ?? []).map((a: any) => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
}

export function commandError(command: any) {
    const error = command.errors?.[0];
    if (! error) {
        return undefined;
    }
    return {
        title: error.type === 'error' ? (error.error?.name ?? 'Error') : 'Expectation missed',
        message: error.type === 'error' ? (error.error?.message ?? '') : (error.expectation?.message ?? ''),
    };
}

function duration(command: any): number {
    return command.time?.took ?? Math.max(0, (command.time?.finished ?? 0) - (command.time?.started ?? 0));
}

const isLog = (event: any) => event.type === 'log';

const isNetwork = (event: any) => event.type === 'response' || event.type === 'update';

/**
 * Console errors and warnings, failed requests and HTTP errors are worth a look.
 */
export const isProblem = (event: any) => isLog(event)
    ? event.messageType === 'error' || event.messageType === 'warning'
    : event.status === 'failed' || Number(event.status) >= 400;

type Page = {
    label: string,
    detail?: string,
    url: string,
};

type Step = {
    command: any,
    events: any[],
    // The page this step started, shown as a divider above it.
    page?: Page,
};

// Commands that open a page themselves, their divider goes above them instead of below.
const OPENS_PAGE = ['visit', 'setContent', 'blank', 'refresh', 'reload', 'back', 'forward', 'goto'];

/**
 * Pages of the same site are named by their path, others by host and path. setContent keeps about:blank, so its
 * title names it.
 */
function pageOf(navigation: any, previous?: Page): Page {
    if (navigation.initiator === 'setContent') {
        return {label: navigation.title || 'Page content', detail: 'setContent', url: `${navigation.url}#${navigation.title}`};
    }
    try {
        const url = new URL(navigation.url);
        const sameSite = previous && previous.url.startsWith(url.origin);
        const path = url.pathname + url.search + url.hash;
        if (! url.protocol.startsWith('http')) {
            // Routes of a page set with setContent only change the hash.
            return {label: url.hash || navigation.url, url: navigation.url};
        }
        return {label: sameSite ? path : url.host + path, url: navigation.url};
    } catch {
        return {label: navigation.url, url: navigation.url};
    }
}

type Section = {
    tool?: any,
    label?: string,
    drafts: any[],
    steps: Step[],
};

/**
 * Console output and requests belong to the command that ran before them, so each step keeps what it caused.
 * Agents mark their tool calls, which become sections, and the commands they make for themselves, which are hidden.
 */
export function groupEvents(events: any[]) {
    const leading: any[] = [];
    const steps: Step[] = [];
    const sections: Section[] = [];
    const annotated = events.some(event => event.type === 'annotation' || event.type === 'handoff');
    let quiet = false;
    let page: Page|undefined;
    let pending: Page|undefined;
    
    const section = () => {
        if (sections.length === 0) {
            sections.push({drafts: [], steps: []});
        }
        return sections[sections.length - 1];
    };
    
    for (const event of events) {
        if (event.type === 'navigation') {
            // The initial blank page of a browser is no page of the test.
            if (event.url === 'about:blank' && event.initiator !== 'setContent' && page === undefined) {
                continue;
            }
            const next = pageOf(event, page);
            if (next.url === page?.url && next.label === page?.label) {
                continue;
            }
            page = next;
            const last = steps[steps.length - 1];
            const during = last && event.timestamp <= (last.command.time?.finished || Infinity);
            // Redirects and the content of setContent replace the page the command opened.
            if (last && during && OPENS_PAGE.includes(last.command.func)) {
                last.page = next;
            } else {
                pending = next;
            }
        } else if (event.type === 'handoff') {
            if (event.state === 'ended') {
                quiet = false;
                sections.push({label: 'After the handoff', drafts: [], steps: []});
            }
        } else if (event.type === 'annotation') {
            if (event.kind === 'quiet') {
                quiet = event.quiet === true;
            } else if (event.kind === 'tool') {
                sections.push({tool: event, drafts: [], steps: []});
            } else if (event.kind === 'draft') {
                section().drafts.push(event);
            }
        } else if (event.type === 'command') {
            // Agents set the timeout of every step, which says nothing about the page.
            if (quiet || (annotated && event.func === 'setTimeout')) {
                continue;
            }
            const step: Step = {command: event, events: [], page: pending};
            pending = undefined;
            steps.push(step);
            section().steps.push(step);
        } else if (isLog(event) || isNetwork(event)) {
            (steps.length === 0 ? leading : steps[steps.length - 1].events).push(event);
        }
    }
    
    return {leading, steps, sections};
}

function formatTook(took: {minutes: number, seconds: number}) {
    const pad = (value: number) => (value < 10 ? '0' : '') + value;
    return `${pad(took.minutes)}:${pad(took.seconds)}s`;
}

/**
 * Same-page URLs are shown by their path, the full URL is in the title.
 */
function shortUrl(url: string|undefined) {
    if (! url) {
        return '';
    }
    try {
        const parsed = new URL(url);
        return parsed.pathname + parsed.search;
    } catch {
        return url;
    }
}

export function eventSummary(event: any) {
    if (isLog(event)) {
        return logText(event);
    }
    return `${event.method ?? ''} ${event.status === 'failed' ? `failed ${event.errorText ?? ''}` : event.status ?? ''} ${shortUrl(event.url)}`.trim();
}

const STATUS_LABEL: Record<string, [string, string]> = {
    failed: ['Failed', 'text-red-300'],
    successful: ['Passed', 'text-green-300'],
};

const eventDetail = (event: any) => {
    if (isLog(event)) {
        const trace = (event.stackTrace ?? [])
            .map((frame: any) => `${frame.url ?? ''}${frame.lineNumber != null ? ':' + frame.lineNumber : ''}${frame.columnNumber != null ? ':' + frame.columnNumber : ''}`)
            .filter(Boolean);
        return (
            <>
                <DetailHeader><span className={isProblem(event) ? 'text-amber-300' : 'text-ink-muted'}>console.{event.messageType}</span></DetailHeader>
                <DetailBlock>{logText(event)}</DetailBlock>
                {trace.length > 0 && <DetailBlock label={'Stack'}>{trace.join('\n')}</DetailBlock>}
            </>
        );
    }
    return (
        <>
            <DetailHeader>
                <span className={isProblem(event) ? 'text-amber-300' : 'text-accent-sky'}>{event.method ?? 'GET'} {event.status === 'failed' ? 'failed' : event.status}</span>
                <span className={'ml-auto text-ink-muted'}>{event.resourceType}</span>
            </DetailHeader>
            <DetailBlock label={'URL'}>{event.url}</DetailBlock>
            {event.errorText && <DetailBlock label={'Error'}>{event.errorText}</DetailBlock>}
        </>
    );
};

/**
 * One line per console message or request, the rest shows up when the mouse rests on it.
 */
export const EventRow = ({event}: {event: any}) => {
    const log = isLog(event);
    
    return (
        <li {...{puth: log ? 'console-message' : 'network-request'}} data-level={log ? event.messageType : undefined}>
            <HoverDetail content={() => eventDetail(event)} className={'flex min-h-[24px] items-center gap-2 rounded px-1 font-mono text-[11.5px] hover:bg-white/4'}>
                <span className={cn('flex-none', isProblem(event) ? 'text-amber-300' : 'text-ink-muted')}>
                    {log ? `console.${event.messageType}` : event.resourceType ?? 'request'}
                </span>
                <span className={'min-w-0 flex-1 truncate text-ink-body'}>{eventSummary(event)}</span>
            </HoverDetail>
        </li>
    );
};

function countLabel(events: any[]) {
    const logs = events.filter(isLog).length;
    const requests = events.length - logs;
    return [
        logs && `${logs} console`,
        requests && `${requests} ${requests === 1 ? 'request' : 'requests'}`,
    ].filter(Boolean).join(' · ');
}

/**
 * The console output and requests between two commands, collapsed into one line.
 */
export const EventGroup = ({events, open, onToggle, label}: {events: any[], open: boolean, onToggle: () => void, label: string}) => {
    if (events.length === 0) {
        return null;
    }
    const problem = events.some(isProblem);
    
    return (
        <div className={'ml-10 border-l border-dashed border-neutral-700 pl-2'}>
            <button
                type={'button'}
                {...{puth: 'step-events'}}
                aria-expanded={open}
                aria-label={`${open ? 'Hide' : 'Show'} ${countLabel(events)} ${label}`}
                onClick={onToggle}
                className={cn(
                    'flex min-h-[22px] w-full items-center gap-1 rounded px-1 text-left font-mono text-[11px] hover:bg-white/4',
                    problem ? 'text-amber-300' : 'text-ink-muted',
                )}
            >
                <Icon name={'expand_more'} size={'0.7rem'} className={cn('flex-none transition-transform', ! open && '-rotate-90')}/>
                {countLabel(events)}
            </button>
            {open && (
                <ul className={'pb-1 pl-4'}>
                    {events.map(event => <EventRow key={event.id} event={event}/>)}
                </ul>
            )}
        </div>
    );
};

/**
 * What a command does decides its color: open pages, act on them, check them, or read from them.
 */
const NAVIGATIONS = ['visit', 'setContent', 'blank', 'refresh', 'reload', 'back', 'forward', 'goto', 'clickLink'];
const READS = /^(evaluate|value|text|attribute|url|title|screenshot|viewport|first|find|get|element|has|is|count|wait$|pause)/;

export function commandKind(func: string): 'navigation'|'check'|'read'|'action' {
    if (NAVIGATIONS.includes(func)) {
        return 'navigation';
    }
    if (/^(assert|waitFor|waitUntil|waitUsing|expect)/.test(func)) {
        return 'check';
    }
    if (READS.test(func)) {
        return 'read';
    }
    return 'action';
}

const KIND_COLOR = {
    navigation: 'text-teal-300',
    action: 'text-accent-sky',
    check: 'text-violet-300',
    read: 'text-ink-muted',
};

const PageDivider = ({page}: {page: Page}) => (
    <li className={'flex items-center gap-2 px-3 pb-1 pt-2.5 font-mono text-[11px] text-ink-muted'} {...{puth: 'page-divider'}} title={page.url}>
        <span aria-hidden={true}>→</span>
        <span className={'max-w-[70%] truncate text-ink-body'}>{page.label}</span>
        {page.detail && <span>{page.detail}</span>}
        <span aria-hidden={true} className={'flex-1 border-t border-dashed border-neutral-700'}/>
    </li>
);

const formatDuration = (took: number) => took >= 1000 ? (took / 1000).toFixed(1) + 's' : Math.round(took) + 'ms';

const formatArgument = (arg: any) => typeof arg === 'string' ? `'${arg}'` : JSON.stringify(arg, null, 2);

const stepDetail = (command: any, index: number, count: number) => {
    const error = commandError(command);
    const args = command.args ?? [];
    
    return (
        <>
            <DetailHeader>
                <span className={'text-accent-sky'}>{displayType(command.on?.type)}.{command.func}</span>
                <span className={'ml-auto text-ink-muted'}>step {index + 1} of {count} · {formatDuration(duration(command))}</span>
            </DetailHeader>
            {args.length > 0 && <DetailBlock label={args.length === 1 ? 'Argument' : 'Arguments'}>{args.map(formatArgument).join(',\n')}</DetailBlock>}
            {error && <DetailBlock label={error.title}>{error.message}</DetailBlock>}
        </>
    );
};

const StepRow = observer(function StepRow({context, step, index, count, open, onToggle}: {
    context: ContextStore,
    step: Step,
    index: number,
    count: number,
    open: boolean,
    onToggle: () => void,
}) {
    const {command, events} = step;
    const preview = context.preview;
    const active = preview?.activeCommand?.id === command.id;
    const failed = (command.errors ?? []).length > 0;
    const took = duration(command);
    // Durations only take space where they matter.
    const showTook = active || failed || took >= 1000;
    const error = failed && context.isAgent ? commandError(command) : undefined;
    
    return (
        // The whole row previews the step, its collapsed events included,
        // so moving within it never falls back to the pinned frame.
        <li
            onMouseEnter={() => preview?.highlightCommand(command)}
            onMouseLeave={() => preview?.unhighlightCommand(command)}
        >
            <HoverDetail content={() => stepDetail(command, index, count)}>
                <button
                    type={'button'}
                    {...{puth: 'step'}}
                    data-active={active ? 'true' : undefined}
                    data-failed={failed ? 'true' : undefined}
                    aria-pressed={active}
                    className={cn(
                        'flex h-[34px] w-full items-center gap-2.5 rounded-lg border px-3 text-left',
                        active ? 'border-accent-blue/45 bg-blue-600/12' : 'border-transparent hover:bg-white/4',
                    )}
                    onClick={() => preview?.toggleCommand(command)}
                >
                    <span className={cn('w-[18px] flex-none text-right font-mono text-[11px]', active ? 'text-accent-sky' : failed ? 'text-red-300' : 'text-[#8f8f8f]')}>
                        {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className={cn('flex-none font-mono text-[13px]', KIND_COLOR[commandKind(command.func)])}>{command.func}</span>
                    <span className={'min-w-0 flex-1 truncate font-mono text-xs text-ink-body'}>{displayArgs(command.args)}</span>
                    {showTook && (
                        <span className={cn('flex-none font-mono text-[11px]', failed ? 'text-red-300' : took >= 1000 ? 'text-amber-300' : 'text-ink-muted')}>
                            {formatDuration(took)}
                        </span>
                    )}
                </button>
            </HoverDetail>
            {error && (
                // Agents fail steps while exploring, so each error stays at its step instead of summing up the run.
                <HoverDetail content={() => stepDetail(command, index, count)} className={'ml-10 border-l border-dashed border-red-400/40 pl-2'}>
                    <div className={'flex min-h-[22px] items-center gap-1.5 px-1 text-[12px] text-red-200'} data-messagetype={'error'}>
                        <span className={'flex-none text-red-300/80'}>{error.title}.</span>
                        <span className={'min-w-0 flex-1 truncate'}>{error.message}</span>
                    </div>
                </HoverDetail>
            )}
            <EventGroup events={events} open={open} onToggle={onToggle} label={`after ${command.func}`}/>
        </li>
    );
});

const ClassSwitcher = observer(function ClassSwitcher({context}: {context: ContextStore}) {
    const {app} = useContext(AppContext);
    const [open, setOpen] = useState(false);

    if (! context.group) {
        return null;
    }

    const siblings: ContextStore[] = app.history.filter((item: ContextStore) => item.group === context.group);
    if (siblings.length < 2) {
        return <div className={'mt-1 font-mono text-xs text-ink-muted'}>{context.group}</div>;
    }
    const failed = siblings.filter(item => item.test.status === 'failed').length;

    return (
        <>
            <button
                type={'button'}
                aria-expanded={open}
                onClick={() => setOpen(! open)}
                className={'mt-1 flex min-h-[28px] flex-wrap items-center gap-1.5 text-left font-mono text-xs text-ink-muted'}
            >
                <span>{context.group}</span>
                <span className={'text-ink-body'}>· {siblings.length} tests</span>
                {failed > 0 && <span>· {failed} failed</span>}
                <Icon name={'expand_more'} size={'0.7rem'} className={cn('transition-transform', open && 'rotate-180')}/>
            </button>
            {open && (
                <ul aria-label={`Tests in ${context.group}`} className={'mt-2 flex flex-col gap-0.5 rounded-lg border border-white/8 bg-shell-main p-1'}>
                    {siblings.map(item => (
                        <li key={item.id}>
                            <button
                                type={'button'}
                                aria-current={item === context}
                                onClick={() => app.setActive(item)}
                                className={cn(
                                    'flex min-h-[36px] w-full items-center gap-2.5 rounded-md border px-2.5 text-left text-[13px] hover:bg-white/4',
                                    item === context ? 'border-accent-blue/45 bg-blue-600/12' : 'border-transparent',
                                )}
                            >
                                <StatusIcon status={item.test.status} size={'0.8rem'}/>
                                <span className={'min-w-0 flex-1 truncate'}>{item.test.name}</span>
                                <span className={'font-mono text-[11.5px] text-ink-muted'}>{formatTook(item.took)}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
});

/**
 * Arrow keys move between steps and switch between before and after, outside of text fields.
 */
function useStepKeys(context: ContextStore, commands: any[]) {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement|null;
            if (event.altKey || event.ctrlKey || event.metaKey || target?.closest('input, textarea, select, [contenteditable="true"]')) {
                return;
            }
            const preview = context.preview;
            if (! preview || commands.length === 0) {
                return;
            }
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                preview.state = event.key === 'ArrowLeft' ? SnapshotState.BEFORE : SnapshotState.AFTER;
                event.preventDefault();
                return;
            }
            if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
                return;
            }
            const current = commands.findIndex(command => command.id === preview.activeCommand?.id);
            const next = current === -1
                ? (event.key === 'ArrowDown' ? 0 : commands.length - 1)
                : Math.min(commands.length - 1, Math.max(0, current + (event.key === 'ArrowDown' ? 1 : -1)));
            if (next !== current) {
                preview.toggleCommand(commands[next]);
            }
            event.preventDefault();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [context, commands]);
}

const ToolHeader = ({tool, steps}: {tool: any, steps: Step[]}) => {
    const failed = steps.some(step => (step.command.errors ?? []).length > 0);
    
    return (
        <div className={'flex items-baseline gap-2 px-3 pb-1 pt-3 font-mono text-[11.5px]'} {...{puth: 'tool-call'}}>
            <span className={failed ? 'text-red-300' : 'text-accent-sky'}>{tool.tool}</span>
            <span className={'min-w-0 flex-1 truncate text-ink-muted'} title={tool.summary}>{tool.summary}</span>
            {steps.length > 0 && <span className={'flex-none text-ink-muted'}>{steps.length} {steps.length === 1 ? 'step' : 'steps'}</span>}
        </div>
    );
};

const DraftCard = ({draft}: {draft: any}) => {
    const [copied, setCopied] = useState(false);
    
    const copy = () => {
        navigator.clipboard?.writeText(draft.code ?? '').then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
    };
    
    return (
        <div className={'mx-1 my-1 rounded-lg border border-white/12 bg-shell-main'} {...{puth: 'draft'}}>
            <HoverDetail
                className={'flex h-[34px] items-center gap-2 pl-3 pr-1.5 font-mono text-[11.5px]'}
                content={() => (
                    <>
                        <DetailHeader>
                            <span className={'text-indigo-300'}>Draft</span>
                            <span className={'text-ink-body'}>{draft.format} · {draft.name}</span>
                            <span className={'ml-auto text-amber-300'}>unverified until the suite passed it</span>
                        </DetailHeader>
                        <DetailBlock>{draft.code}</DetailBlock>
                    </>
                )}
            >
                <span className={'flex-none text-indigo-300'}>Draft</span>
                <span className={'min-w-0 flex-1 truncate text-ink-body'}>{draft.format} · {draft.name}</span>
                <span className={'flex-none rounded bg-amber-500/[0.14] px-1.5 text-[10.5px] text-amber-300'}>unverified</span>
                <button type={'button'} onClick={copy} className={'min-h-[26px] flex-none rounded-md border border-white/20 px-2 text-ink-body hover:bg-white/8'}>
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </HoverDetail>
        </div>
    );
};

const HANDOFF_TEXT: Record<string, string> = {
    waiting: 'Waiting for an agent to take over',
    claimed: 'An agent drives this test',
    ended: 'Handed back to the test',
};

const TestRun = observer(function TestRun({context}: {context: ContextStore}) {
    const {app} = useContext(AppContext);
    const containerRef: Ref<HTMLDivElement> = useRef(null);
    const [tab, setTab] = useState<'steps'|'console'|'network'>('steps');
    const [toggled, setToggled] = useState<Record<string, boolean>>({});
    
    const {leading, steps, sections} = groupEvents(context.renderedEvents);
    const commands = steps.map(step => step.command);
    const logs = context.renderedEvents.filter(isLog);
    const requests = context.renderedEvents.filter(isNetwork);
    useStepKeys(context, commands);
    
    const agent = context.isAgent;
    const handoff = context.handoff;
    const failedIndex = agent ? -1 : steps.findIndex(step => (step.command.errors ?? []).length > 0);
    const failed = failedIndex === -1 ? undefined : steps[failedIndex];
    const error = failed && commandError(failed.command);
    // The last console error or failed request before the failing step is the likely cause.
    const cause = failed && [...leading, ...steps.slice(0, failedIndex).flatMap(step => step.events)]
        .reverse()
        .find(event => isLog(event) ? event.messageType === 'error' : isProblem(event));
    
    const [statusLabel, statusClass] = agent
        ? (context.isLive ? ['Live', 'text-green-300'] : ['Closed', 'text-ink-muted'])
        : STATUS_LABEL[context.test.status ?? ''] ?? ['Running', 'text-amber-300'];
    
    useLayoutEffect(() => {
        if (containerRef.current && context.followIncoming && context.renderedEvents.length !== 0) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [context, context.renderedEvents.length]);
    
    // Following keeps the newest step selected while a session runs.
    const toggleFollow = () => runInAction(() => {
        context.followIncoming = ! context.followIncoming;
        const last = commands[commands.length - 1];
        if (context.followIncoming && last && context.preview?.activeCommand?.id !== last.id) {
            context.preview?.toggleCommand(last);
        }
    });
    
    const showFailure = () => {
        setTab('steps');
        if (failed && context.preview?.activeCommand?.id !== failed.command.id) {
            context.preview?.toggleCommand(failed.command);
        }
    };
    
    const tabClass = (on: boolean) => cn(
        'flex min-h-[32px] items-center gap-1.5 rounded-md border px-2.5 text-[13px]',
        on ? 'border-white/20 bg-neutral-800 text-ink' : 'border-transparent text-ink-muted hover:text-ink',
    );
    const smallButton = (on: boolean) => cn(
        'flex h-8 items-center gap-1.5 rounded-md border px-2.5 font-mono text-[11.5px]',
        on ? 'border-accent-blue/45 bg-blue-600/[0.14] text-accent-sky' : 'border-shell-control bg-shell-main text-ink-body hover:text-ink',
    );
    
    const stepRow = (step: Step) => {
        const index = steps.indexOf(step);
        const open = toggled[step.command.id] ?? false;
        return (
            <Fragment key={step.command.id}>
            {step.page && <PageDivider page={step.page}/>}
            <StepRow
                context={context}
                step={step}
                index={index}
                count={steps.length}
                open={open}
                onToggle={() => setToggled({...toggled, [step.command.id]: ! open})}
            />
            </Fragment>
        );
    };
    
    return (
        <section aria-label={agent ? 'Agent session' : 'Test run'} className={'flex min-h-0 flex-1 flex-col'}>
            <div className={'flex items-center gap-2 border-b border-dashed border-neutral-800 py-2 pl-4 pr-3 font-mono text-xs'}>
                <span className={cn('flex items-center gap-1.5', statusClass)}>
                    {agent && context.isLive && <span aria-hidden={true} className={'h-[7px] w-[7px] animate-pulse rounded-full bg-green-500'}/>}
                    {statusLabel}
                </span>
                <span className={'ml-auto mr-1 text-ink-muted'}>
                    {agent && `${context.toolCalls} ${context.toolCalls === 1 ? 'call' : 'calls'} · `}
                    {steps.length} {steps.length === 1 ? 'step' : 'steps'} · {formatTook(context.took)}
                </span>
                {agent && context.isLive && (
                    <button type={'button'} {...{puth: 'follow'}} aria-pressed={context.followIncoming} onClick={toggleFollow} className={smallButton(context.followIncoming)}>Follow</button>
                )}
                {agent && (
                    <button type={'button'} aria-pressed={app.pinned.includes(context.id)} onClick={() => app.togglePinned(context)} className={smallButton(app.pinned.includes(context.id))} title={'Keep this session listed after it closed'}>
                        {app.pinned.includes(context.id) ? 'Pinned' : 'Pin'}
                    </button>
                )}
                <DownloadHandler
                    name={`snapshot-${context.createdAt}-${context.id}.puth`}
                    resolver={() => context.blob()}
                />
            </div>
            
            <div className={'px-4 pb-3 pt-3.5'}>
                <div className={'wrap-break-word text-[17px] font-medium tracking-[-0.01em]'}>{context.test.name}</div>
                {agent ? <div className={'mt-1 font-mono text-xs text-ink-muted'}>Agent session</div> : <ClassSwitcher context={context}/>}
            </div>
            
            {handoff && (
                <div className={'mx-3 mb-3 flex items-center gap-2.5 rounded-[10px] border border-indigo-300/25 bg-indigo-500/8 px-3 py-2 text-[12.5px]'} {...{puth: 'handoff'}}>
                    <span aria-hidden={true} className={cn('h-[7px] w-[7px] flex-none rounded-full', handoff.state === 'claimed' ? 'animate-pulse bg-indigo-300' : 'bg-indigo-300/50')}/>
                    <span className={'min-w-0 flex-1 text-ink-body'}>
                        {HANDOFF_TEXT[handoff.state]}{handoff.name && <span className={'font-mono text-ink-muted'}> · {handoff.name}</span>}
                    </span>
                    {handoff.state === 'ended' && handoff.reason && <span className={'font-mono text-[11px] text-ink-muted'}>{handoff.reason}</span>}
                </div>
            )}
            
            {failed && error && (
                <div className={'mx-3 mb-3 overflow-hidden rounded-[10px] border border-white/[0.14] bg-shell-main'} data-messagetype={'error'}>
                    <div className={'flex items-center gap-2 border-b border-dashed border-neutral-800 py-2 pl-3 pr-2 font-mono text-[11.5px]'}>
                        <span className={'min-w-0 flex-1 truncate text-red-300'}>
                            Failed at {failed.command.func} {failed.command.args?.length ? displayArgs(failed.command.args.slice(0, 1)) : ''}
                        </span>
                        <button
                            type={'button'}
                            onClick={showFailure}
                            className={'min-h-[28px] flex-none rounded-md border border-white/20 px-2.5 text-ink-body hover:bg-white/8'}
                        >Show step</button>
                    </div>
                    <div className={'px-3 py-2.5 text-[13px] leading-relaxed text-neutral-200'}>
                        <span className={'text-ink-muted'}>{error.title}.</span> {error.message}
                    </div>
                    {cause && (
                        <div className={'px-3 pb-2.5 text-[12.5px] leading-normal text-ink-muted'}>
                            {isLog(cause) ? 'Console error' : 'Request'} before this step: <span className={'font-mono text-ink-body'}>{eventSummary(cause)}</span>
                        </div>
                    )}
                </div>
            )}
            
            <div role={'tablist'} aria-label={'Events'} className={'flex gap-1 border-b border-dashed border-neutral-800 px-3 pb-2.5'}>
                <button type={'button'} role={'tab'} {...{puth: 'tab-steps'}} aria-selected={tab === 'steps'} className={tabClass(tab === 'steps')} onClick={() => setTab('steps')}>
                    Steps <span className={'font-mono text-[11px] text-ink-muted'}>{steps.length}</span>
                </button>
                <button type={'button'} role={'tab'} {...{puth: 'tab-console'}} aria-selected={tab === 'console'} className={tabClass(tab === 'console')} onClick={() => setTab('console')}>
                    Console <span className={'font-mono text-[11px] text-ink-muted'}>{logs.length}</span>
                </button>
                {requests.length > 0 && (
                    <button type={'button'} role={'tab'} {...{puth: 'tab-network'}} aria-selected={tab === 'network'} className={tabClass(tab === 'network')} onClick={() => setTab('network')}>
                        Network <span className={'font-mono text-[11px] text-ink-muted'}>{requests.length}</span>
                    </button>
                )}
            </div>
            
            <div ref={containerRef} className={'min-h-0 flex-1 overflow-y-auto p-2'}>
                {tab === 'steps' ? (
                    <>
                        <EventGroup
                            events={leading}
                            open={toggled.leading ?? false}
                            onToggle={() => setToggled({...toggled, leading: ! toggled.leading})}
                            label={'before the first step'}
                        />
                        {sections.map((section, index) => (
                            <div key={section.tool?.id ?? index}>
                                {section.tool && <ToolHeader tool={section.tool} steps={section.steps}/>}
                                {! section.tool && (section.label || (index === 0 && sections.length > 1 && context.handoff)) && (
                                    <div className={'px-3 pb-1 pt-3 font-mono text-[11.5px] text-ink-muted'}>{section.label ?? 'Before the handoff'}</div>
                                )}
                                <ol className={'flex flex-col'}>{section.steps.map(stepRow)}</ol>
                                {section.drafts.map(draft => <DraftCard key={draft.id} draft={draft}/>)}
                            </div>
                        ))}
                        {steps.length === 0 && leading.length === 0 && sections.length === 0 && (
                            <div className={'px-3 py-4 text-[13px] text-ink-muted'}>No steps recorded yet.</div>
                        )}
                    </>
                ) : (
                    <ul className={'px-3'}>
                        {(tab === 'console' ? logs : requests).map((event: any) => <EventRow key={event.id} event={event}/>)}
                        {tab === 'console' && logs.length === 0 && <li className={'py-4 text-[13px] text-ink-muted'}>No console output.</li>}
                    </ul>
                )}
            </div>
            
            <div className={'border-t border-shell-line px-4 py-2 font-mono text-[11.5px] text-ink-muted'}>↑ ↓ step · ← → before / after</div>
        </section>
    );
});

export const Context = observer(function Context() {
    const {app} = useContext(AppContext);

    if (! app.activeContext) {
        return (
            <div className={'flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-ink-muted'}>
                <Icon name={'explore'} size={'2rem'}/>
                {app.view === 'agents' ? 'Select an agent session below.' : 'Select a test in the history list below.'}
            </div>
        );
    }

    return <TestRun key={app.activeContext.id} context={app.activeContext}/>;
});
