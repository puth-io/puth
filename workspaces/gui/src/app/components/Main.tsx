import {observer} from 'mobx-react-lite';
import {useContext} from 'react';
import {SnapshotState} from '@puth/core';
import {AppContext} from '../../shared/Contexts.tsx';
import {cn} from '../../lib/utils';
import {displayType, groupEvents} from './Context.tsx';

const segment = (on: boolean) => cn(
    'min-w-[64px] rounded-md px-3 font-mono text-xs',
    on ? 'bg-blue-600 text-white' : 'text-ink-muted hover:text-ink',
);

export const MainTop = observer(function MainTop() {
    const {app} = useContext(AppContext);
    const preview = app.previewStore;
    const state = preview?.visibleHighlightState ?? preview?.state;
    const page = preview?.visibleScreencast?.page;

    const setState = (state: SnapshotState) => {
        if (preview) {
            preview.state = state;
        }
    };

    return (
        <div className={'flex flex-none flex-wrap items-center gap-2.5 border-b border-shell-line bg-shell-bar px-3 py-2.5'}>
            <div role={'group'} aria-label={'Snapshot'} className={'flex h-8 rounded-lg border border-shell-control bg-shell-main p-0.5'}>
                <button type={'button'} aria-pressed={state === SnapshotState.BEFORE} className={segment(state === SnapshotState.BEFORE)} onClick={() => setState(SnapshotState.BEFORE)}>Before</button>
                <button type={'button'} aria-pressed={state === SnapshotState.AFTER} className={segment(state === SnapshotState.AFTER)} onClick={() => setState(SnapshotState.AFTER)}>After</button>
            </div>
            <div className={'flex h-8 min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-white/[0.12] bg-shell-main px-3 font-mono text-xs text-ink-body'}>
                <svg aria-hidden={true} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
                <span className={'truncate'} aria-label={'Page URL'}>{page?.url ?? ''}</span>
            </div>
            {page?.viewport && (
                <span className={'font-mono text-xs text-ink-muted'}>{page.viewport.width} × {page.viewport.height}</span>
            )}
        </div>
    );
});

export const MainBottom = observer(function MainBottom() {
    const {app} = useContext(AppContext);
    const preview = app.previewStore;
    const command = preview?.visibleCommand as any;
    // Counts the steps the panel shows, without what agents did for themselves.
    const commands = groupEvents(app.activeContext?.renderedEvents ?? []).steps.map(step => step.command);
    const index = command ? commands.findIndex((item: any) => item.id === command.id) : -1;
    const pad = (value: number) => (value < 10 ? '0' : '') + value;

    return (
        <div className={'flex flex-none flex-wrap justify-between gap-x-6 gap-y-2 border-t border-shell-line bg-shell-bar px-4 py-3 font-mono text-xs text-ink-muted'}>
            {command && index !== -1 ? (
                <span>
                    Step <span className={'text-ink'}>{pad(index + 1)}</span> / {pad(commands.length)}
                    {' · '}<span className={'text-accent-sky'}>{displayType(command.on?.type)}.{command.func}</span>
                    {' · '}{preview?.visibleHighlightState}
                </span>
            ) : (
                <span>Latest frame</span>
            )}
            <span>{preview?.isVisibleHighlight ? 'Previewing · click to pin' : 'Hover a step to preview it'}</span>
        </div>
    );
});
