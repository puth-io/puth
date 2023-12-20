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
            <div className={'grid grid-rows-[3rem_1fr] h-screen w-screen'}>
                <div className={'flex items-center px-2 shrink-0'} style={{backgroundColor: '#22252c', boxShadow: '0 0 8px 0px black', zIndex: 10}}>
                    <div className={'flex items-center mr-auto'}>
                        <img src={puthLogoBlue} className={'h-5 mr-2'}/>
                        Puth
                    </div>
                    
                    <ConnectionDropdown/>
                    
                    <Button size={'icon-xs'} variant={'ghost'}>
                        <Icon name={'settings'}/>
                    </Button>
                </div>
                <div className={'grid grid-cols-[500px_1fr]'}>
                    <div
                        className={'flex flex-col min-h-0 grow'}
                        style={{background: '#2a2d36', borderRight: '1px solid #3d4249'}}
                    >
                        {sidebar}
                    </div>
                    
                    <div className="flex flex-col grow overflow-auto px-4 py-2">
                        {mainTop && (
                            <div className={'shrink flex items-center h-12 px-2'}>
                                {mainTop}
                            </div>
                        )}
                        
                        <div className={'grow p-2 overflow-auto'}>
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
