import {Icon} from "@/components/icon.tsx";
import {observer} from "mobx-react-lite";
import {useContext} from "react";
import {Button} from "@/components/ui/button.tsx";
import Command from "@/app/components/Command/Command.tsx";
import Log from "@/app/components/Log/Log.tsx";
import Request from "@/app/components/Request/Request.tsx";
import {AppContext} from "@/App.tsx";

export function StatusIcon({status, className, ...rest}: any) {
    let icon = 'pending';
    if (status === 'failed') {
        icon = 'error';
        className = 'text-red-500 ' + className;
    } else if (status === 'success') {
        icon = 'check_circle';
        className = 'text-green-500 ' + className;
    }
    
    return <Icon name={icon} className={className} {...rest}/>;
}

export const Context = observer(function Context() {
    const {app} = useContext(AppContext);
    
    if (! app.active.connection || ! app.active.connection.active.context) {
        return <></>;
    }
    
    let commandIndex = 0;
    return (
        <>
            <div className={'flex items-center px-5 py-5'}>
                <div className={'grow flex items-center text-lg'}>
                    <StatusIcon
                        status={app.active.connection?.active.context?.test.status}
                        className={'mr-2'}
                    /> {app.active.connection?.active.context?.test.name}
                </div>
                <div className={'flex items-center text-gray-300 ml-auto'}><Icon name={'timer'}/> 00:54s</div>
                <div className={'flex items-center text-gray-300 ml-2 mr-2'}><Icon name={'history'}/> 1min</div>
                <Button variant={'ghost'} size={'icon-xs'}><Icon name={'download'}/></Button>
            </div>
            
            <div className={'grow overflow-y-auto px-5'}>
                <table className="table-auto w-full" style={{border: 'none'}}>
                    <tbody className={''}>
                    {app.active.connection?.active.context?.renderedEvents.map(((event) => {
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
                    </tbody>
                </table>
            </div>
        </>
    );
});
