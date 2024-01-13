import {observer} from "mobx-react-lite";
import ContextStore from "@/app/store/ContextStore.tsx";
import {useContext, useState} from "react";
import {StatusIcon} from "@/app/components/Context.tsx";
import {Icon} from "@/components/icon.tsx";
import {Input} from "@/components/ui/input.tsx";
import {AppContext} from "@/App.tsx";

export const HistoryItem = observer(function HistoryItem({context}: {context: ContextStore}) {
    const {app} = useContext(AppContext);
    
    if (! app.active.connection?.contexts) {
        return <></>;
    }
    
    let onClick = () => app.active.connection.active.context = context;
    let active = app.active.connection.active.context === context;
    
    return (
        <div
            key={context.id}
            className={'flex flex-col px-4 py-2 mt-1 bg-context-step hover:bg-context-step-selected cursor-pointer ' + (active ? 'bg-context-step-selected' : '')}
            style={{paddingRight: '0.375rem'}}
            onClick={onClick}
        >
            <div className={'flex items-center'}>
                <StatusIcon status={context.test.status} className={'mr-1'}/> {context.test.name}
                {/*{context.test.name} <StatusIcon status={context.test.status} className={'ml-1'}/>*/}
            </div>
            <div className={'mt-1'}>
                <div className={'flex items-center text-gray-400 italic ml-auto'}>
                    <Icon name={'history'}/> just now
                </div>
            </div>
        </div>
    );
});

export const History = observer(function History() {
    const {app} = useContext(AppContext);
    const [open, setOpen] = useState(true);
    
    if (! app.active.connection) {
        return <></>;
    }
    
    return (
        <div className={`border-t-4 border-solid rounded-t-xl ${open ? 'grow' : ''}`} style={{borderColor: '#22252b', maxHeight: '40vh'}}>
            <div
                className={'px-5 flex items-center text-lg'}
            >
                <div className={'flex-1 py-3 flex items-center cursor-pointer'} onClick={_ => setOpen(!open)}>
                    <Icon name={open ? 'expand_more' : 'expand_less'} size={'1.5rem'} className={'mr-2'}/> History
                </div>
                
                <Icon name={'upload'} size={'1.25rem'} className={'ml-auto'}/>
                <Icon name={'delete'} size={'1.25rem'} className={'ml-6'}/>
            </div>
            
            {open && (
                <>
                    {app.active.connection.contexts.length === 0 ? (
                        <div className={'m-5 p-5 flex items-center border-light border-2 border-solid italic'}><Icon name={'error'} className={'mr-1'}/> No test ran on this instance.</div>
                    ) : (
                        <>
                            <div className={'px-5 mb-3 flex items-center text-lg'}>
                                <Input className={'h-8'} placeholder={'Filter history'}/>
                                <Input className={'h-8 ml-4'} placeholder={'Status'}/>
                            </div>
                            <div
                                className={'px-5 pb-3 grow overflow-y-auto'}
                            >
                                {app.active.connection.contexts.map((context: any) => <HistoryItem
                                    key={context.id}
                                    context={context}
                                />)}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
});
