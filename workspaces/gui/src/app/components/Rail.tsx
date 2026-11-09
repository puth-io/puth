import {observer} from 'mobx-react-lite';
import {ReactNode, useContext} from 'react';
import puthLogoBlue from '../../assets/puth-logo-blue.png';
import {AppContext} from '../../shared/Contexts';
import {Popover, PopoverContent, PopoverTrigger} from '../../components/ui/popover';
import {cn} from '../../lib/utils';
import DevStore from '../store/DebugStoreClass';
import {ConnectionButton} from './ConnectionDropdown';

const RailIcon = ({d}: {d: string}) => (
    <svg aria-hidden={true} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={d}/>
    </svg>
);

const RailButton = ({label, active, onClick, children, badge}: {
    label: string,
    active?: boolean,
    onClick?: () => void,
    children: ReactNode,
    badge?: number,
}) => (
    <button
        type={'button'}
        aria-label={badge !== undefined ? `${label}, ${badge}` : label}
        aria-current={active ? 'page' : undefined}
        title={label}
        onClick={onClick}
        className={cn(
            'relative flex h-10 w-10 items-center justify-center rounded-[10px] border',
            active ? 'border-accent-blue/35 bg-blue-600/[0.16] text-accent-sky' : 'border-transparent text-ink-muted hover:bg-white/[0.05] hover:text-ink',
        )}
    >
        {children}
        {badge !== undefined && (
            <span className={'absolute right-[3px] top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-neutral-800 px-[3px] font-mono text-[10px] text-ink-body'}>{badge}</span>
        )}
    </button>
);

const Toggle = ({id, label, checked, onChange}: {id: string, label: string, checked: boolean, onChange: (value: boolean) => void}) => (
    <label htmlFor={id} className={'flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm text-ink-body hover:bg-white/[0.04]'}>
        <input
            id={id}
            type={'checkbox'}
            checked={checked}
            onChange={event => onChange(event.target.checked)}
            className={'m-0 h-4 w-4 accent-blue-600'}
        />
        {label}
    </label>
);

export const Settings = observer(function Settings() {
    const {app} = useContext(AppContext);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type={'button'}
                    aria-label={'Settings'}
                    title={'Settings'}
                    className={'flex h-10 w-10 items-center justify-center rounded-[10px] border border-transparent text-ink-muted hover:bg-white/[0.05] hover:text-ink data-[state=open]:border-accent-blue/35 data-[state=open]:bg-blue-600/[0.16] data-[state=open]:text-accent-sky'}
                >
                    <RailIcon d={'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12'}/>
                </button>
            </PopoverTrigger>
            <PopoverContent
                side={'right'}
                align={'end'}
                sideOffset={10}
                className={'w-[260px] overflow-hidden rounded-[10px] border-white/[0.16] bg-[#151515] p-0 text-ink shadow-[0_20px_50px_rgba(0,0,0,0.6)]'}
            >
                <div className={'border-b border-dashed border-neutral-800 px-3.5 py-2.5 font-mono text-[11.5px] text-accent-blue'}>Settings</div>
                <div className={'flex flex-col p-1.5'}>
                    <Toggle id={'darken-preview'} label={'Darken preview'} checked={app.settings.preview.darken} onChange={value => app.setDarkenPreview(value)}/>
                    <Toggle id={'debug-mode'} label={'Debug mode'} checked={DevStore.debug} onChange={value => DevStore.debug = value}/>
                </div>
            </PopoverContent>
        </Popover>
    );
});

export const Rail = observer(function Rail() {
    const {app} = useContext(AppContext);

    return (
        <nav aria-label={'App'} className={'flex w-14 flex-none flex-col items-center gap-1.5 border-r border-shell-line bg-shell-rail py-3'}>
            <div className={'flex flex-col items-center gap-0.5'} title={app.name.suffix ? `Puth ${app.name.suffix}` : 'Puth'}>
                <img src={puthLogoBlue} alt={'Puth'} className={'h-6 w-6 object-contain'}/>
                {app.name.suffix && <span className={'font-mono text-[9px] text-accent-sky'}>{app.name.suffix}</span>}
            </div>
            <span aria-hidden={true} className={'my-1 w-6 border-t border-dashed border-neutral-700'}/>

            <RailButton label={'Instance'} active={app.view === 'instance'} onClick={() => app.setView('instance')}>
                <RailIcon d={'M4 5h16v11H4zM8 20h8M12 16v4'}/>
            </RailButton>
            {app.isConnected && (
                <RailButton label={'Agents'} active={app.view === 'agents'} onClick={() => app.setView('agents')} badge={app.liveAgents || undefined}>
                    <RailIcon d={'M12 3v3M8 6h8a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3ZM9.5 11.5v1M14.5 11.5v1M2 12h3M19 12h3'}/>
                </RailButton>
            )}
            {app.hasLocalContexts && (
                <RailButton label={'Local snapshots'} active={app.view === 'local'} onClick={() => app.setView('local')} badge={app.dragAndDropped.contexts.length}>
                    <RailIcon d={'M4 7h6l2 2h8v10H4z'}/>
                </RailButton>
            )}

            <span className={'flex-1'}/>
            <a
                href={'https://puth.io/guide/getting-started'}
                target={'_blank'}
                rel={'noreferrer'}
                aria-label={'Documentation, opens puth.io'}
                title={'Documentation'}
                {...{puth: 'docs'}}
                className={'flex h-10 w-10 items-center justify-center rounded-[10px] border border-transparent text-ink-muted hover:bg-white/[0.05] hover:text-ink'}
            >
                <RailIcon d={'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5'}/>
            </a>
            <Settings/>
            <ConnectionButton/>
        </nav>
    );
});
