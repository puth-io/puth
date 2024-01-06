import {observer} from "mobx-react-lite";
import puthLogoBlue from "@/assets/puth-logo-blue.png";
import {Icon} from "@/components/icon.tsx";
import {Button} from "@/components/ui/button.tsx";
import {ConnectionDropdown} from "@/app/components/ConnectionDropdown.tsx";

export const AppLayout = observer(function AppLayout({
    sidebar,
    preview,
    mainTop,
    mainBottom,
}: any) {
    return (
        <>
            <div className={'grid grid-rows-[2.5rem_1fr] h-screen w-screen'}>
                <div className={'flex items-center px-2 shrink-0'} style={{backgroundColor: '#22252b', boxShadow: '0 1px 4px 0px #1a1c1f', borderBottom: '1px solid rgba(25,27,31,0.74)', zIndex: 10}}>
                    <div className={'flex items-center mr-auto'}>
                        <img src={puthLogoBlue} className={'h-6 mr-2'}/>
                        Puth
                    </div>
                    
                    <ConnectionDropdown/>
                    
                    <Button size={'icon-xs'} variant={'ghost'}>
                        <Icon name={'settings'}/>
                    </Button>
                </div>
                <div className={'grid grid-cols-[450px_1fr]'}>
                    <div
                        className={'flex flex-col min-h-0 grow'}
                        style={{background: '#2a2d36', borderRight: '1px solid #1a1d21'}}
                    >
                        {sidebar}
                    </div>
                    
                    <div className="flex flex-col grow overflow-auto">
                        {mainTop && (
                            <div className={'shrink flex items-center h-12 px-4 mt-2'}>
                                {mainTop}
                            </div>
                        )}
                        
                        <div className={'grow px-4 p-2 overflow-auto'}>
                            {preview}
                        </div>
                        
                        {mainBottom && (
                            <div className={'shrink flex'} style={{borderTop: '1px solid #3d4249'}}>
                                {mainBottom}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
});
