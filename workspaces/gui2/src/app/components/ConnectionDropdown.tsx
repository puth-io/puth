import {observer} from "mobx-react-lite";
import {useContext, useState} from "react";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Icon} from "@/components/icon.tsx";
import {AppContext} from "@/App.tsx";
import {Input} from "@/components/ui/input.tsx";

export const ConnectionDropdown = observer(function ConnectionDropdown() {
    const {app} = useContext(AppContext);
    const [open, setOpen] = useState(false);
    const isConnected = app.connections.length !== 0;
    
    return (
        <div
            className={'flex items-center rounded-full border uppercase text-xs'}
            style={{fontSize: '0.625rem', letterSpacing: '1.25px', borderColor: 'rgba(255,255,255,0.16)', fontWeight: 500}}
        >
            <div className={'px-2 flex'} style={{color: isConnected ? '#0db87c' : 'rgba(255,255,255,0.54)'}}>
                {isConnected ? (
                    <><Icon name={'check'}/> Connected</>
                ) : (
                    <>- No connection</>
                )}
            </div>
            <Popover open={open} onOpenChange={open => setOpen(open)}>
                <PopoverTrigger asChild>
                    <div
                        className={'flex items-center rounded-full cursor-pointer select-none'}
                        style={{padding: '0.125rem 0.5rem', margin: '0.125rem 0.125rem 0.125rem 0px', backgroundColor: open ? 'rgba(60, 130, 246, 0.84)' : 'rgba(255,255,255,0.08)', color: open ? 'black' : 'rgba(247,248,255,0.84)'}}
                    >
                        {isConnected ? 'Switch instance' : 'Connect to instance'}
                    </div>
                </PopoverTrigger>
                <PopoverContent sideOffset={6} className={'w-[400px] p-0'} align={'end'} style={{backgroundColor: '#2a2d36', boxShadow: '0 2px 6px 0 rgba(0,0,0,0.16)', borderColor: '#22252b', borderWidth: '0 0 3px 0'}}>
                    <div className={'p-4 text-sm'}>Connect to instance</div>
                    <div className={'px-4 pb-2 text-xs font-light flex flex-col'}>
                        Please connect to a Puth instance
                        <Input className={'mt-4'} placeholder={'Enter an IP or hostname or select one of the suggestions'}/>
                        <Button className={'mt-6 ml-auto'}>CONNECT</Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
});
