import {observer} from "mobx-react-lite";
import ContextStore from "@/app/store/ContextStore.tsx";
import {useContext} from "react";
import {ContextStatusIcon} from "@/app/components/Context.tsx";
import {Icon} from "@/components/icon.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {AppContext} from "@/App.tsx";

export const HistoryItem = observer(function HistoryItem({context}: {context: ContextStore}) {
    const app = useContext(AppContext);
    
    if (! app.active.connection?.contexts) {
        return <></>;
    }
    
    let onClick = () => app.active.connection.active.context = context;
    let active = app.active.connection.active.context === context;
    
    return (
        <div
            key={context.id}
            className={'flex pl-2 items-center hover:bg-gray-700 hover:cursor-pointer ' + (active ? 'bg-gray-600' : '')}
            style={{paddingRight: '0.375rem'}}
            onClick={onClick}
        >
            <ContextStatusIcon status={context.test.status} className={'mr-1'}/> {context.test.name}
            <div className={'flex items-center text-gray-400 italic ml-auto'}>
                <Icon name={'history'}/> just now
            </div>
        </div>
    );
});

export const History = observer(function History() {
    const app = useContext(AppContext);
    
    if (! app.active.connection) {
        return <></>;
    }
    
    return (
        <div className={'grow'}>
            <div
                className={'p-2 flex items-center'}
                style={{borderTop: '1px solid hsl(var(--input))', maxHeight: '500px'}}
            >
                <Input className={'h-8'} placeholder={'Filter history'}/>
                
                <Button variant={'outline'} size={'xs'} className={'ml-auto'}><Icon
                    name={'filter_alt'}
                    className={'mr-1'}
                /> Failed</Button>
                <Button variant={'outline'} size={'xs'}><Icon name={'upload'} className={'mr-1'}/> Import</Button>
                <Button variant={'outline'} size={'xs'}>Clear</Button>
            </div>
            
            <div
                className={'py-2 grow pb-2 overflow-y-auto'}
                style={{marginRight: '0.125rem', borderTop: '1px solid hsl(var(--input))', maxHeight: '500px'}}
            >
                {app.active.connection.contexts.map((context: any) => <HistoryItem
                    key={context.id}
                    context={context}
                />)}
            </div>
        </div>
    );
});
