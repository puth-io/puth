import {Icon} from '../../components/icon';
import {observer} from 'mobx-react-lite';
import {Ref, useCallback, useContext, useEffect, useRef} from 'react';
import {Button} from '../../components/ui/button';
import {AppContext} from '../../shared/Contexts';
import Command from '@/app/components/Command';
import Log from './Log/Log';
import Request from './Request/Request';

export function StatusIcon({status, className, ...rest}: any) {
    let icon = 'pending';
    if (status === 'failed') {
        icon = 'error';
        className = 'text-red-500 ' + className;
    } else if (status === 'successful') {
        icon = 'check_circle';
        className = 'text-green-500 ' + className;
    }
    
    return <Icon name={icon} className={className} {...rest}/>;
}

export function DownloadHandler({resolver}: any) {
    const ref = useRef<HTMLAnchorElement>(null);
    
    const download = async () => {
        if (! ref.current) {
            return;
        }
        let blob = await resolver();
        ref.current.href = URL.createObjectURL(blob);
        ref.current.download = 'snapshot.puth';
        ref.current.click();
        URL.revokeObjectURL(ref.current.href);
    };
    
    return (
        <>
            <Button variant={'ghost'} size={'icon-xs'} onClick={download}>
                <Icon name={'download'}/>
            </Button>
            <a href="" style={{display: 'none'}} ref={ref}></a>
        </>
    );
}

const ContextList = observer(function ContextList({updateCallback}: any) {
    const {app} = useContext(AppContext);
    useEffect(() => updateCallback && updateCallback());
    
    if (! app.activeContext) {
        return <></>;
    }
    
    let commandIndex = 0;
    return (
        <>
            {app.activeContext.renderedEvents.map(((event: any) => {
                if (event.type === 'command') {
                    return <Command key={event.id} index={commandIndex++} command={event} showTimings={false}/>;
                } else if (event.type === 'log') {
                    return <Log key={event.id} log={event}/>;
                } else if (event.type === 'request') {
                    return <Request key={event.id} request={event}/>;
                    // } else if (event.type === 'screencasts') {
                    //     return (
                    //         <tr
                    //             key={event.id}
                    //             className={app.active.connection?.preview.visibleScreencast === event ? 'bg-gray-700' : ''}
                    //         >
                    //             <td colSpan={6}>{event.timestamp} {event.type} {app.active.connection?.preview.visibleScreencast === event ? 'active' : ''}</td>
                    //         </tr>
                    //     );
                    // } else {
                    //     return (
                    //         <tr key={event.id}>
                    //             <td colSpan={6}>No component found for type to display</td>
                    //         </tr>
                    //     );
                }
            }))}
        </>
    );
});

const ContextTimeTook = observer(function ContextTimeTook() {
    const {app} = useContext(AppContext);
    if (! app.activeContext) {
        return <></>;
    }
    
    let minutes = app.activeContext.took.minutes < 10 ? '0' + app.activeContext.took.minutes : app.activeContext.took.minutes;
    let seconds = app.activeContext.took.seconds < 10 ? '0' + app.activeContext.took.seconds : app.activeContext.took.seconds;
    
    return <><Icon name={'timer'} className={'mr-1'}/> {minutes}:{seconds}s</>;
})

export const Context = observer(function Context() {
    const {app} = useContext(AppContext);
    const containerRef: Ref<HTMLDivElement> = useRef(null);
    
    const updateCallback = useCallback(() => {
        if (containerRef.current && app.activeContext?.followIncoming && app.activeContext.renderedEvents.length !== 0) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, []);
    
    if (! app.activeContext) {
        return <></>;
    }
    if (! app.activeContext) {
        return (
            <div className={'p-8 flex-1 flex flex-col items-center justify-center text-lg text-light text-center'}>
                <Icon name={'explore'} size={'3rem'} className={'mb-4'}/>
                Select a test in the history list. Head over to puth.io/getting-started if you need help running your
                first test.
            </div>
        );
    }
    
    return (
        <>
            <div className={'flex items-center px-5 py-5'}>
                <div className={'grow flex items-center text-lg'}>
                    <StatusIcon
                        status={app.activeContext?.test.status}
                        className={'mr-2'}
                    /> {app.activeContext?.test.name}
                </div>
                <div className={'flex items-center text-gray-300 ml-auto'}>
                    <ContextTimeTook/>
                </div>
                <div className={'flex items-center text-gray-300 mx-2'}>
                    <Icon name={'history'} className={'mr-1'}/> 1min
                </div>
                <DownloadHandler resolver={() => app.activeContext?.blob()}/>
            </div>
            
            <div
                ref={containerRef}
                className={'grow overflow-y-auto px-5'}
            >
                <table className={'table-auto w-full context-event-table'} style={{margin: '-4px 0'}}>
                    <tbody>
                    <ContextList updateCallback={updateCallback}/>
                    </tbody>
                </table>
            </div>
        </>
    );
});
