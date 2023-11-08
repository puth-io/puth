import {Button} from "@/components/ui/button";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {Icon} from "@/components/icon.tsx";
import {Input} from "@/components/ui/input";
import {Toggle} from "@/components/ui/toggle.tsx";
import AppStore, {Connection, connectionSuggestions} from "@/app/store/AppStore.tsx";

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {Separator} from "@/components/ui/separator";
import {observer} from "mobx-react-lite";
import PreviewStore from "@/app/store/PreviewStore.tsx";
import context from "puth/lib/Context.ts";
import ContextStore from "@/app/store/ContextStore.tsx";


// tailwind include: dark

function QuickConnect() {
    function connect(host: string) {
        let connection = new Connection(host);
        AppStore.connections.push(connection);
        AppStore.active.connection = connection;
    }
    
    return (
        <div className={'p-2'}>
            <Card>
                <CardHeader>
                    <CardTitle>Connect to a Puth instance</CardTitle>
                    <CardDescription>Enter an IP or hostname or select one of the recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className={'flex'}>
                        <Input placeholder={'IP or hostname'}/>
                        <Button>Connect</Button>
                    </div>
                    <Separator className={'my-4'}/>
                    <p className={'mb-2'}>Directly connect to</p>
                    {connectionSuggestions.map((suggestion, idx) => (
                        <Button
                            variant={'secondary'}
                            key={idx}
                            className={'w-full mb-1'}
                            onClick={() => connect(suggestion)}
                        >{suggestion}</Button>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

function ContextStatusIcon({status, ...rest}) {
    let icon = 'pending';
    if (status === 'failed') {
        icon = 'close';
    } else if (status === 'success') {
        icon = 'check';
    }
    
    return <Icon name={icon} {...rest}/>;
}

const Context = observer(function Context() {
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
                    <tbody className={'divide-y divide-gray-700'}>
                    <tr>
                        <td className={'pl-2'}>1</td>
                        <td>Page</td>
                        <td>get</td>
                        <td className={'pr-2'}>#test</td>
                    </tr>
                    <tr style={{background: '#ffffff17'}}>
                        <td className={'pl-2'}>2</td>
                        <td>Page</td>
                        <td>get</td>
                        <td className={'pr-2'}>#test</td>
                    </tr>
                    <tr>
                        <td className={'pl-2'}>3</td>
                        <td>Page</td>
                        <td>get</td>
                        <td className={'pr-2'}>#test</td>
                    </tr>
                    </tbody>
                </table>
            </div>
        </>
    );
});

const HistoryItem = observer(function HistoryItem({context}: {context: ContextStore}) {
    let onClick = () => AppStore.active.connection.active.context = context;
    let active = AppStore.active.connection.active.context === context;
    
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

const History = observer(function History() {
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
                {AppStore.active.connection && AppStore.active.connection?.contexts.map((context) =>
                    <HistoryItem key={context.id} context={context}/>)}
            </div>
        </div>
    );
});

const ConnectionDropdown = observer(function ConnectionDropdown() {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button size={'xs'} variant={'outline'} className={'ml-1'}>
                    <Icon name={'cloud'} className={'mr-2'}/>
                    {AppStore.active.connection?.uri}
                    <Icon name={'expand_more'} className={'ml-2 text-xs'}/>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                Hallo
            </PopoverContent>
        </Popover>
    );
});

function App() {
    return (
        <>
            <div className={'grid grid-cols-[500px_1fr] h-screen w-screen'}>
                <div
                    className={'flex flex-col min-h-0 grow'}
                    style={{background: '#313438', borderRight: '1px solid #3d4249'}}
                >
                    <div
                        className={'flex items-center px-2 h-12 shrink-0'}
                        style={{borderBottom: '1px solid hsl(var(--input))'}}
                    >
                        <div>Puth</div>
                        
                        <Button size={'icon-xs'} variant={'outline'} className={'ml-auto'}>
                            <Icon name={'settings'}/>
                        </Button>
                        
                        {AppStore.active.connection && <ConnectionDropdown/>}
                    </div>
                    
                    {! AppStore.active.connection && <QuickConnect/>}
                    {AppStore.active.connection && <Context/>}
                    {AppStore.active.connection && <History/>}
                </div>
                
                <div className="flex flex-col grow">
                    <div className={'shrink flex items-center h-12 px-2'} style={{borderBottom: '1px solid #3d4249'}}>
                        
                        <Button size={'xs'} variant={'outline'}>Frame</Button>
                        <Button size={'xs'} variant={'outline'} className={'mr-2'}>Dom</Button>
                        
                        <Button size={'icon-xs'} variant={'outline'}><Icon name={'autoplay'}/></Button>
                        <Button size={'xs'} variant={'outline'}>Before</Button>
                        <Button size={'xs'} variant={'outline'} className={'mr-2'}>After</Button>
                        
                        
                        <Input className={'h-8 grow'} value={PreviewStore.activeScreencastUrl ?? ''} disabled/>
                        
                        <Toggle size={'xs'} className={'ml-2'}><Icon name={'dark_mode'}/></Toggle>
                    </div>
                    
                    <div className={'grow p-2'}>
                        preview container
                    </div>
                    
                    <div className={'shrink flex'} style={{borderTop: '1px solid #3d4249'}}>
                        <Button variant={'ghost'} size={'toggle'}><Icon
                            name={'error'}
                            className={'mr-1'}
                        /> Exceptions</Button>
                        <Button variant={'ghost'} size={'toggle'}><Icon
                            name={'folder'}
                            className={'mr-1'}
                        /> Files</Button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default observer(App);
