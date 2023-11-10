import {observer} from "mobx-react-lite";

export const AppLayout = observer(function AppLayout({
    sidebar,
    preview,
    mainTop,
    mainBottom,
}: any) {
    return (
        <>
            <div className={'grid grid-cols-[500px_1fr] h-screen w-screen'}>
                <div
                    className={'flex flex-col min-h-0 grow'}
                    style={{background: '#313438', borderRight: '1px solid #3d4249'}}
                >
                    {sidebar}
                </div>
                
                <div className="flex flex-col grow overflow-auto">
                    {mainTop && (
                        <div className={'shrink flex items-center h-12 px-2'} style={{borderBottom: '1px solid #3d4249'}}>
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
        </>
    );
});
