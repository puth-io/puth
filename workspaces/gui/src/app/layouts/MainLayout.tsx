import {observer} from 'mobx-react-lite';
import {ReactNode, useContext} from 'react';
import {AppContext} from '../../shared/Contexts';
import {Rail} from '../components/Rail';
import {Context} from '../components/Context';
import {History} from '../components/History';
import {AgentList} from '../components/Agents';
import {MainBottom, MainTop} from '../components/Main';
import {Preview} from '../components/Preview';
import {ConnectPanel} from '../components/ConnectionDropdown';

const DOCS = 'https://puth.io/guide';

const Card = ({label, labelClass, children, link}: {label: string, labelClass: string, children: ReactNode, link?: [string, string]}) => (
    <section className={'overflow-hidden rounded-xl border border-white/12 bg-linear-to-b from-[#191919] to-[#141414] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'}>
        <div className={'border-b border-dashed border-neutral-800 px-5 py-3 font-mono text-xs'}>
            <span className={labelClass}>{label}</span>
        </div>
        <div className={'p-5'}>{children}</div>
        {link && (
            <div className={'flex justify-end border-t border-dashed border-neutral-800 px-5 py-3 font-mono text-[12.5px]'}>
                <a href={link[1]} target={'_blank'} rel={'noreferrer'} className={'text-accent-sky hover:text-blue-200'}>{link[0]} →</a>
            </div>
        )}
    </section>
);

/**
 * Shown while there is nothing to inspect: connect to an instance or drop in a snapshot.
 */
const ConnectState = () => (
    <div className={'min-h-0 flex-1 overflow-y-auto'}>
        <div className={'mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pb-8 pt-4'}>
            <section className={'shell-hero relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-xl px-10 pb-9 pt-12'}>
                <div aria-hidden={true} className={'shell-hero-dots absolute inset-0'}/>
                <div aria-hidden={true} className={'shell-hero-grain absolute inset-0'}/>
                <div aria-hidden={true} className={'shell-hero-scrim absolute inset-0'}/>
                <div className={'relative max-w-[620px]'}>
                    <div className={'font-mono text-xs text-blue-100'}>No instance connected</div>
                    <h1 className={'mt-3 text-4xl font-medium leading-tight tracking-[-0.02em] text-white'}>
                        Connect to a server, or drop in a snapshot.
                    </h1>
                    <p className={'mt-3.5 text-[15px] leading-relaxed text-blue-50'}>
                        Tests show up here as they run. A <code className={'rounded bg-white/15 px-1.5 py-px font-mono text-[13px] text-white'}>.puth</code> file from CI works without any connection.
                    </p>
                </div>
            </section>

            <div className={'grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4'}>
                <Card label={'Connect'} labelClass={'text-accent-blue'}>
                    <ConnectPanel/>
                </Card>
                <div className={'flex flex-col gap-4'}>
                    <Card label={'Start a server'} labelClass={'text-accent-blue'} link={['Getting started', `${DOCS}/getting-started`]}>
                        <p className={'text-sm leading-relaxed text-ink-muted'}>One container serves the browser API and this GUI.</p>
                        <code className={'mt-3.5 block overflow-x-auto whitespace-nowrap rounded-lg border border-white/10 bg-shell-main px-3.5 py-3 font-mono text-[12.5px] text-ink-body'}>
                            docker run -it --rm -p 127.0.0.1:7345:7345 ghcr.io/puth-io/puth
                        </code>
                    </Card>
                    <Card label={'Replay from CI'} labelClass={'text-indigo-300'} link={['Snapshots in CI', `${DOCS}/ci-cd`]}>
                        <p className={'text-sm leading-relaxed text-ink-muted'}>
                            Drag a <code className={'rounded bg-white/12 px-1.5 py-px font-mono text-[12.5px] text-ink'}>.puth</code> snapshot anywhere into this window to step through a recorded test.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    </div>
);

const Placeholder = observer(function Placeholder() {
    const {app} = useContext(AppContext);
    const waiting = app.view !== 'local' && app.history.length === 0;

    return (
        <div className={'shell-dots flex flex-1 items-center justify-center p-8 text-center font-mono text-xs text-ink-muted'}>
            {app.view === 'agents'
                ? (waiting ? 'No agent sessions yet.' : 'Select an agent session to watch it.')
                : (waiting ? 'Connected. Tests show up here as they run.' : 'Select a test in the history to inspect it.')}
        </div>
    );
});

export const AppLayout = observer(function AppLayout() {
    const {app} = useContext(AppContext);
    const disconnected = app.view !== 'local' && ! app.isConnected;

    return (
        <div className={'flex h-screen w-screen bg-shell-main text-ink'}>
            <Rail/>
            {app.empty ? (
                <main className={'flex min-w-0 flex-1 flex-col'}><ConnectState/></main>
            ) : (
                <div className={'flex min-w-0 flex-1'}>
                    <aside aria-label={'Test'} className={'flex w-[440px] min-w-[320px] shrink flex-col border-r border-shell-line bg-shell-side'}>
                        <Context/>
                        {app.view === 'agents' ? <AgentList/> : <History/>}
                    </aside>
                    <main className={'flex min-w-0 flex-1 flex-col'}>
                        {app.previewStore ? (
                            <>
                                <MainTop/>
                                <div className={'shell-dots flex min-h-0 flex-1 items-start justify-center overflow-auto p-4'}>
                                    <Preview/>
                                </div>
                                <MainBottom/>
                            </>
                        ) : disconnected ? <ConnectState/> : <Placeholder/>}
                    </main>
                </div>
            )}
        </div>
    );
});
