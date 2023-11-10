import {Icon} from "@/components/icon.tsx";
import {observer} from "mobx-react-lite";
import {useContext} from "react";
import AppStore from "@/app/store/AppStore.tsx";
import {Button} from "@/components/ui/button.tsx";
import Command from "@/app/components/Command/Command.tsx";
import Log from "@/app/components/Log/Log.tsx";
import Request from "@/app/components/Request/Request.tsx";
import {AppContext} from "@/App.tsx";

export function ContextStatusIcon({status, ...rest}: any) {
    let icon = 'pending';
    if (status === 'failed') {
        icon = 'error';
    } else if (status === 'success') {
        icon = 'task_alt';
    }
    
    return <Icon name={icon} {...rest}/>;
}

export const Context = observer(function Context() {
    const app = useContext(AppContext);
    
    if (!app.active.connection || !app.active.connection.active.context) {
        return <></>;
    }
    
    let commandIndex = 0;
    return (
        <>
            <div className={'flex items-center p-2'} style={{borderBottom: '1px solid hsl(var(--input))'}}>
                <div className={'grow flex items-center'}>
                    <ContextStatusIcon
                        status={AppStore.active.connection?.active.context?.test.status}
                        className={'mr-1'}
                    /> {AppStore.active.connection?.active.context?.test.name}
                </div>
                <div className={'flex items-center text-gray-300 ml-auto'}><Icon name={'timer'}/> 00:54s</div>
                <div className={'flex items-center text-gray-300 ml-2 mr-2'}><Icon name={'history'}/> 1min</div>
                <Button variant={'outline'} size={'icon-xs'}><Icon name={'download'}/></Button>
            </div>
            
            <div className={'grow overflow-y-auto'}>
                <table className="table-auto w-full">
                    <tbody className={''}>
                    {AppStore.active.connection?.active.context?.renderedEvents.map(((event) => {
                        if (event.type === 'command') {
                            return <Command key={event.id} index={commandIndex++} command={event} showTimings={false}/>;
                        } else if (event.type === 'log') {
                            return <Log key={event.id} log={event}/>;
                        } else if (event.type === 'request') {
                            return <Request key={event.id} request={event}/>;
                        } else {
                            return <tr key={event.id}>
                                <td colSpan={6}>No component found for type to display</td>
                            </tr>;
                        }
                    }))}
                    </tbody>
                </table>
            </div>
        </>
    );
});
