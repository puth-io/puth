import {observer} from "mobx-react-lite";
import puthLogoBlue from "@/assets/puth-logo-blue.png";
import {Icon} from "@/components/icon.tsx";
import {Button} from "@/components/ui/button.tsx";
import {ConnectionDropdown} from "@/app/components/ConnectionDropdown.tsx";
import {useContext} from "react";
import {AppContext} from "@/App.tsx";

function AppModeSwitch() {
    const {app} = useContext(AppContext);
    const local = app.view === 'local';
    const click = () => app.view = local ? 'instance' : 'local';
    
    return (
        <div
            className={'flex items-center rounded-full border uppercase text-xs mr-4'}
            style={{
                fontSize: '0.625rem',
                letterSpacing: '1.25px',
                borderColor: 'rgba(255,255,255,0.16)',
                fontWeight: 500,
            }}
        >
            <div
                className={'flex items-center rounded-full cursor-pointer select-none'}
                style={{
                    padding: '0.125rem 0.5rem',
                    margin: '0.125rem 0.125rem 0.125rem 0.125rem',
                    backgroundColor: local ? 'rgba(60, 130, 246, 0.84)' : 'rgba(255,255,255,0.08)',
                    color: local ? 'black' : 'rgba(247,248,255,0.84)',
                }}
                onClick={click}
            >
                {local ? 'Instance' : 'Local'}
            </div>
        </div>
    );
}

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
                        Puth
                    </div>
                    
                    <AppModeSwitch/>
                    <ConnectionDropdown/>
                    
                    <Button size={'icon-xs'} variant={'ghost'}>
                        <Icon name={'settings'}/>
                    </Button>
                </div>
                <div className={'grid grid-cols-[450px_1fr]'}>
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
                                
                                {mainBottom && (
                                    <div className={'shrink flex'} style={{borderTop: '1px solid #3d4249'}}>
                                        {mainBottom}
                                    </div>
                                )}
                            </>
                        )}
                    
                    </div>
                </div>
            </div>
        </>
    );
});
