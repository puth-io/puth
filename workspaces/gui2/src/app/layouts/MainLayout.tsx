import {observer} from "mobx-react-lite";
import puthLogoBlue from "../../assets/puth-logo-blue.png";
import {Icon} from "../../components/icon.tsx";
import {Button} from "../../components/ui/button.tsx";
import {useContext, useState} from "react";
import {AppContext} from '../../shared/Contexts';
import {Popover, PopoverContent, PopoverTrigger} from "../../components/ui/popover";
import {Checkbox} from "../../components/ui/checkbox";
import DevStore from "../store/DebugStoreClass";
import {ConnectionDropdown} from "../components/ConnectionDropdown.tsx";

export const Settings = observer(() => {
    const {app} = useContext(AppContext);
    const [open, setOpen] = useState(false);
    
    return (
        <Popover open={open} onOpenChange={open => setOpen(open)}>
            <PopoverTrigger asChild>
                <Button size={'icon-xs'} variant={'ghost'}>
                    <Icon name={'settings'}/>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                sideOffset={6}
                className={'w-[250px]'}
                align={'end'}
                style={{
                    backgroundColor: '#2a2d36',
                    boxShadow: '0 2px 6px 0 rgba(0,0,0,0.16)',
                    borderColor: '#22252b',
                    borderWidth: '0 0 3px 0',
                }}
            >
                <div className={' text-sm text-uppercase tracking-widest'}>SETTINGS</div>
                
                <div className="flex items-center space-x-2 mt-6">
                    <Checkbox
                        id="darken-preview"
                        checked={app.settings.preview.darken}
                        onCheckedChange={checked => app.setDarkenPreview(checked === true)}
                    />
                    <label
                        htmlFor="darken-preview"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Darken preview
                    </label>
                </div>
                <div className="flex items-center space-x-2 mt-4">
                    <Checkbox
                        id="debug-mode"
                        checked={DevStore.debug}
                        onCheckedChange={checked => DevStore.debug = checked === true}
                    />
                    <label
                        htmlFor="debug-mode"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Debug mode
                    </label>
                </div>
            </PopoverContent>
        </Popover>
    );
});

export const AppLayout = observer(function AppLayout({
    sidebar,
    preview,
    mainTop,
    mainBottom,
}: any) {
    const {app} = useContext(AppContext);
    
    return (
        <>
            <div className={'grid grid-rows-[2.5rem_1fr] h-screen w-screen'}>
                <div
                    className={'flex items-center px-2 shrink-0'}
                    style={{
                        backgroundColor: '#22252b',
                        boxShadow: '0 1px 4px 0px #1a1c1f',
                        borderBottom: '1px solid rgba(25,27,31,0.74)',
                        zIndex: 10,
                    }}
                >
                    <div className={'flex items-center mr-auto text-base'}>
                        <img src={puthLogoBlue} className={'h-6 mr-2'}/>
                        Puth {app.name.suffix && (
                            <span className={'text-blue-500 font-bold ml-1'}> {app.name.suffix}</span>
                        )}
                    </div>
                    
                    <ConnectionDropdown/>
                    <Settings/>
                </div>
                <div className={'grid grid-cols-[450px_1fr] min-h-0'}>
                    <div
                        className={'flex flex-col min-h-0 grow'}
                        style={{background: 'rgba(44, 47, 56, 54%)', borderRight: '1px solid #1a1d21'}}
                    >
                        {sidebar}
                    </div>
                    
                    <div className="flex flex-col grow overflow-auto">
                        {! app.activeContext ? (
                            <div className={'flex-1 flex flex-col items-center justify-center text-light text-2xl italic text-center px-8'}>
                                <Icon className={'mb-4'} name={'cloud_off'} size={'6rem'}/>
                                No instance connected. Please connect to a Puth instance.
                            </div>
                        ) : (
                            <>
                                {mainTop && (
                                    <div className={'shrink flex items-center h-7 px-4 mt-3'}>
                                        {mainTop}
                                    </div>
                                )}
                                
                                <div className={'grow m-4 overflow-auto'} style={{border: '1px solid #2f333d'}}>
                                    {preview}
                                </div>
                                
                                {mainBottom && (<>{mainBottom}</>)}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
});
