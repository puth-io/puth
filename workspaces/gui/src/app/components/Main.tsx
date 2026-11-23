import {observer} from 'mobx-react-lite';
import {type ReactNode, useContext} from 'react';
import {SnapshotMode, SnapshotState} from '@puth/core';
import {AppContext} from '../../shared/Contexts.tsx';
import {cn} from '../../lib/utils';
import {displayType, groupEvents} from './Context.tsx';

const segment = (on: boolean) => cn(
    'min-w-[64px] rounded-md px-3 font-mono text-xs',
    on ? 'bg-blue-600 text-white' : 'text-ink-muted hover:text-ink',
);

const PreviewToggle = ({puth, label, title, on, disabled, onChange, children}: {
    puth: string,
    label: string,
    title: string,
    on: boolean,
    disabled?: boolean,
    onChange: (value: boolean) => void,
    children: ReactNode,
}) => (
    <button
        type={'button'}
        {...{puth}}
        aria-label={label}
        aria-pressed={on}
        title={title}
        disabled={disabled}
        onClick={() => onChange(! on)}
        className={cn(
            'flex h-8 w-8 flex-none items-center justify-center rounded-lg border disabled:cursor-not-allowed disabled:opacity-40',
            on ? 'border-accent-blue/35 bg-blue-600/16 text-accent-sky' : 'border-shell-control bg-shell-main text-ink-muted enabled:hover:text-ink',
        )}
    >
        <svg aria-hidden={true} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
    </button>
);

export const MainTop = observer(function MainTop() {
    const {app} = useContext(AppContext);
    const preview = app.previewStore;
    const state = preview?.visibleHighlightState ?? preview?.state;
    const page = preview?.visiblePage;
    const mode = preview?.showsDom ? SnapshotMode.DOM : SnapshotMode.FRAME;
    // The recorded DOM is the default; frames stay available, also for pages whose content the DOM can't show.
    const canSwitch = preview !== undefined && preview !== null && preview.hasDom && ! preview.replayUnavailable && preview.context.screencasts.length > 0;

    const setState = (state: SnapshotState) => {
        if (preview) {
            preview.state = state;
        }
    };

    return (
        <div className={'flex flex-none flex-wrap items-center gap-2.5 border-b border-shell-line bg-shell-bar px-3 py-2.5'}>
            <div role={'group'} aria-label={'Snapshot'} className={'flex h-8 rounded-lg border border-shell-control bg-shell-main p-0.5'}>
                <button type={'button'} {...{puth: 'state-before'}} aria-pressed={state === SnapshotState.BEFORE} className={segment(state === SnapshotState.BEFORE)} onClick={() => setState(SnapshotState.BEFORE)}>Before</button>
                <button type={'button'} {...{puth: 'state-after'}} aria-pressed={state === SnapshotState.AFTER} className={segment(state === SnapshotState.AFTER)} onClick={() => setState(SnapshotState.AFTER)}>After</button>
            </div>
            {canSwitch && (
                <div role={'group'} aria-label={'View'} className={'flex h-8 rounded-lg border border-shell-control bg-shell-main p-0.5'}>
                    <button type={'button'} {...{puth: 'view-dom'}} aria-pressed={mode === SnapshotMode.DOM} className={segment(mode === SnapshotMode.DOM)} onClick={() => preview.mode = SnapshotMode.DOM}>DOM</button>
                    <button type={'button'} {...{puth: 'view-frame'}} aria-pressed={mode === SnapshotMode.FRAME} className={segment(mode === SnapshotMode.FRAME)} onClick={() => preview.mode = SnapshotMode.FRAME}>Frame</button>
                </div>
            )}
            <div className={'flex h-8 min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-white/12 bg-shell-main px-3 font-mono text-xs text-ink-body'}>
                <svg aria-hidden={true} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
                <span className={'truncate'} aria-label={'Page URL'}>{page?.url ?? ''}</span>
            </div>
            <div role={'group'} aria-label={'Preview options'} className={'flex gap-1.5'}>
                <PreviewToggle
                    puth={'toggle-highlight'}
                    label={'Highlight targets'}
                    title={preview?.showsDom ? 'Highlight what the step acted on' : 'Only the recorded DOM shows what the step acted on'}
                    on={app.settings.preview.highlight}
                    disabled={! preview?.showsDom}
                    onChange={value => app.setHighlightPreview(value)}
                >
                    <circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                </PreviewToggle>
                <PreviewToggle
                    puth={'toggle-darken'}
                    label={'Darken preview'}
                    title={'Darken preview'}
                    on={app.settings.preview.darken}
                    onChange={value => app.setDarkenPreview(value)}
                >
                    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>
                </PreviewToggle>
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
