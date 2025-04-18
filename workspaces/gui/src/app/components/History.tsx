import {useContext, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {Icon} from '../../components/icon.tsx';
import {Input} from '../../components/ui/input.tsx';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '../../components/ui/select';
import {ContextStatus} from '@puth/core/src/Types';
import {AppContext} from '../../shared/Contexts.tsx';
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

export const HistoryItem = observer(function HistoryItem({context}: {context: ContextStore}) {
    const {app} = useContext(AppContext);
    
    let onClick = () => app.setActive(context);
    let active = app.activeContext === context;
    
    return (
        <div
            key={context.id}
            className={'flex flex-col px-4 py-2 mt-1 bg-context-step hover:bg-context-step-selected cursor-pointer ' + (active ? 'bg-context-step-selected' : '')}
            style={{paddingRight: '0.375rem'}}
            onClick={onClick}
        >
            <div className={'flex items-center'}>
                <StatusIcon status={context.test.status} className={'mr-1'}/> {context.test.name}
            </div>
            <div className={'mt-1'}>
                <div className={'flex items-center text-gray-400 italic ml-auto'}>
                    <Icon name={'history'}/> {formatDate(context.lastActivity)}
                </div>
            </div>
        </div>
    );
});

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
        history = history.filter((item: any) => item.test.name.toLowerCase().includes(searchLC) || item.group.toLowerCase().includes(searchLC));
    }
    if (statusFilter !== '') {
        history = history.filter((item: any) => item.test.status === statusFilter);
    }
    
    return (
        <div
            className={`flex flex-col border-t-4 border-solid rounded-t-xl ${open ? 'grow' : ''}`}
            style={{borderColor: '#22252b', maxHeight: '40vh'}}
        >
            <div
                className={'px-5 flex items-center text-lg'}
            >
                <div className={'flex-1 py-3 flex items-center cursor-pointer'} onClick={_ => setOpen(! open)}>
                    <Icon name={open ? 'expand_more' : 'expand_less'} size={'1.5rem'} className={'mr-2'}/> History
                </div>
                
                {/*<Icon name={'upload'} size={'1.25rem'} className={'ml-auto'}/>*/}
                {/*<Icon name={'delete'} size={'1.25rem'} className={'ml-6'}/>*/}
            </div>
            
            {open && (
                <>
                    <div className={'px-5 mb-3 flex items-center text-lg'}>
                        <Input
                            className={'h-8'}
                            placeholder={'Filter history'}
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                        />
                        <Select value={statusFilter} onValueChange={value => setStatusFilter(value)}>
                            <SelectTrigger className="w-[180px] ml-2" defaultValue={-1}>
                                <SelectValue placeholder="Filter status"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ContextStatus.SUCCESSFUL}>Succeeded</SelectItem>
                                <SelectItem value={ContextStatus.FAILED}>Failed</SelectItem>
                                <SelectItem value={ContextStatus.PENDING}>Pending</SelectItem>
                            </SelectContent>
                        </Select>
                        {(search !== '' || statusFilter !== '') && (
                            <Icon
                                name={'cancel'} size={'1.25rem'} className={'ml-2 cursor-pointer'} onClick={() => {
                                setSearch('');
                                setStatusFilter('');
                            }}
                            />
                        )}
                    </div>
                    <div
                        className={'px-5 pb-3 grow overflow-y-auto'}
                    >
                        {history.length === 0 && (
                            <div
                                className={'p-4 flex items-center border border-solid border-white border-opacity-10 rounded text-sm text-gray-400'}
                                style={{background: '#22252b'}}
                            >
                                <Icon name={'error'} className={'mr-2'}/> No tests have yet been run on this instance
                            </div>
                        )}
                        {history.map((context: any) => <HistoryItem
                            key={context.id}
                            context={context}
                        />)}
                    </div>
                </>
            )}
        </div>
    );
});
