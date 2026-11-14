import {useContext, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {ContextStatus} from '@puth/core';
import {Icon} from '../../components/icon.tsx';
import {AppContext} from '../../shared/Contexts.tsx';
import {cn} from '../../lib/utils';
import ContextStore from '@/app/store/ContextStore';
import {StatusIcon} from './Context.tsx';

function formatDate(rawDate: string|number|Date): string {
    let date = new Date(rawDate);
    let month = '' + (date.getMonth() + 1);
    let day = '' + date.getDate();
    let year = date.getFullYear();

    if (month.length < 2) {
        month = '0' + month;
    }
    if (day.length < 2) {
        day = '0' + day;
    }

    return [year, month, day].join('-');
}

function formatTook(took: {minutes: number, seconds: number}) {
    const pad = (value: number) => (value < 10 ? '0' : '') + value;
    return `${pad(took.minutes)}:${pad(took.seconds)}s`;
}

export const HistoryItem = observer(function HistoryItem({context}: {context: ContextStore}) {
    const {app} = useContext(AppContext);
    const active = app.activeContext === context;

    return (
        <li>
            <button
                type={'button'}
                {...{puth: 'history-item'}}
                aria-current={active}
                className={cn(
                    'flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left hover:bg-white/4',
                    active ? 'border-accent-blue/45 bg-blue-600/12' : 'border-transparent',
                )}
                onClick={() => app.setActive(context)}
            >
                <StatusIcon status={context.test.status} size={'0.95rem'} className={'mt-0.5 flex-none'}/>
                <span className={'flex min-w-0 flex-1 flex-col gap-[3px]'}>
                    <span className={'flex items-center gap-1.5'}>
                        <span className={'truncate text-sm text-ink'}>{context.test.name}</span>
                        {(context.handoff?.state === 'waiting' || context.handoff?.state === 'claimed') && (
                            <span className={'flex-none rounded bg-indigo-500/16 px-1.5 font-mono text-[10.5px] text-indigo-200'}>
                                {context.handoff.state === 'claimed' ? 'agent' : 'handoff'}
                            </span>
                        )}
                    </span>
                    {context.group && <span className={'truncate font-mono text-[11.5px] text-ink-muted'}>{context.group}</span>}
                </span>
                <span className={'flex flex-none flex-col items-end gap-[3px] font-mono text-[11.5px] text-ink-muted'}>
                    <span>{formatTook(context.took)}</span>
                    <span>{formatDate(context.lastActivity)}</span>
                </span>
            </button>
        </li>
    );
});

const FILTERS: [string, string][] = [
    ['', 'All'],
    [ContextStatus.FAILED, 'Failed'],
    [ContextStatus.SUCCESSFUL, 'Passed'],
    [ContextStatus.PENDING, 'Running'],
];

export const History = observer(function History() {
    const {app} = useContext(AppContext);
    const [open, setOpen] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    if (app.empty) {
        return <></>;
    }

    let history = app.history;
    if (search !== '') {
        let searchLC = search.toLowerCase();
        history = history.filter((item: any) => item.test.name.toLowerCase().includes(searchLC) || (item.group ?? '').toLowerCase().includes(searchLC));
    }
    if (statusFilter !== '') {
        // Contexts without a status are still running.
        history = history.filter((item: any) => (item.test.status ?? ContextStatus.PENDING) === statusFilter);
    }

    return (
        <section aria-label={'History'} className={cn('flex flex-col border-t border-shell-line', open && 'max-h-[40vh]')}>
            <button
                type={'button'}
                aria-expanded={open}
                onClick={() => setOpen(! open)}
                className={'flex min-h-[44px] flex-none items-center gap-2.5 border-b border-dashed border-neutral-800 px-4 font-mono text-xs'}
            >
                <span className={'text-accent-sky'}>History</span>
                <span className={'text-ink-muted'}>{app.history.length}</span>
                <Icon name={'expand_more'} className={cn('ml-auto text-ink-muted transition-transform', open && 'rotate-180')}/>
            </button>

            {open && (
                <>
                    <div className={'flex flex-none flex-wrap gap-2 px-3 pb-1 pt-2.5'}>
                        <label className={'flex h-[34px] min-w-[160px] flex-1 items-center gap-2 rounded-lg border border-shell-control bg-shell-main px-2.5 text-ink-muted'}>
                            <svg aria-hidden={true} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
                            <input
                                type={'search'}
                                aria-label={'Filter history'}
                                placeholder={'Filter tests'}
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                className={'min-w-0 flex-1 border-0 bg-transparent text-[13px] text-ink outline-hidden'}
                            />
                        </label>
                        <div role={'group'} aria-label={'Status'} className={'flex h-[34px] rounded-lg border border-shell-control bg-shell-main p-0.5'}>
                            {FILTERS.map(([value, label]) => (
                                <button
                                    key={label}
                                    type={'button'}
                                    aria-pressed={statusFilter === value}
                                    onClick={() => setStatusFilter(value)}
                                    className={cn(
                                        'rounded-md px-2.5 font-mono text-[11.5px]',
                                        statusFilter === value ? 'bg-neutral-800 text-ink' : 'text-ink-muted hover:text-ink',
                                    )}
                                >{label}</button>
                            ))}
                        </div>
                    </div>
                    <ul className={'flex min-h-0 flex-col gap-0.5 overflow-y-auto px-2 pb-2.5 pt-1.5'}>
                        {history.length === 0 && (
                            <li className={'px-2.5 py-3.5 text-[13px] text-ink-muted'}>
                                {app.history.length === 0 ? 'No tests have run on this instance yet.' : 'No tests match this filter.'}
                            </li>
                        )}
                        {history.map((context: any) => <HistoryItem key={context.id} context={context}/>)}
                    </ul>
                </>
            )}
        </section>
    );
});
