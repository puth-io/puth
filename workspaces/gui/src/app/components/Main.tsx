import {observer} from "mobx-react-lite";
import {Button} from "../../components/ui/button.tsx";
import {Icon} from "../../components/icon.tsx";
import {Input} from "../../components/ui/input.tsx";
import {useContext} from "react";
import {AppContext} from "../../shared/Contexts.tsx";

// @ts-ignore
export const GroupContainer = function GroupContainer({children, className = '', ...rest}) {
    return (
        <div
            className={'flex rounded-full leading-none tracking-widest select-none text-xxs ' + className}
            style={{backgroundColor: '#2b303b'}}
            {...rest}
        >{children}</div>
    )
}

// @ts-ignore
export const GroupButton = function GroupButton({active, children, className = '', ...rest}) {
    return (
        <div
            className={`p-2 rounded-full cursor-pointer ${className} ` + (active ? 'bg-primary text-black' : 'text-unselected hover:bg-primary-hover-hover')}
            style={{padding: 'calc(0.5rem + 1px) 0.75rem calc(0.5rem + 1px) 0.75rem'}}
            {...rest}
        >
            {children}
        </div>
    )
}

export const MainTopButtons = observer(function MainTopButtons() {
    const {app} = useContext(AppContext);
    
    let setScreencastMode = (mode: 'before'|'after') => {
        if (! app.previewStore) {
            return;
        }
        app.previewStore.state = mode;
    };
    
    return (
        <>
            <GroupContainer className={'mr-4'}>
                <GroupButton
                    active={app.previewStore?.state === 'before'}
                    onClick={() => setScreencastMode('before')}
                    children={'BEFORE'}
                />
                <GroupButton
                    active={app.previewStore?.state === 'after'}
                    onClick={() => setScreencastMode('after')}
                    children={'AFTER'}
                />
            </GroupContainer>
        </>
    );
});

export const MainTopRight = observer(function MainTopRight() {
    // return (
    //     <Toggle size={'xs'}><Icon name={'dark_mode'}/></Toggle>
    // );
    return <></>;
});

export const MainTop = observer(function MainTop({
    left,
    right,
}: any) {
    const {app} = useContext(AppContext);
    
    return (
        <>
            {left ? left : <MainTopButtons/>}
            
            <Input
                className={'h-7 grow bg-lighter border-none'}
                value={app.previewStore?.visibleScreencast?.page?.url ?? ''}
                disabled
            />
            
            {/*{app.active.connection?.preview?.visibleScreencast && <><Icon*/}
            {/*    name={'screenshot_monitor'}*/}
            {/*    className={'mr-1'}*/}
            {/*/> {app.active.connection?.preview?.visibleScreencast?.page.viewport.width}x{app.active.connection?.preview?.visibleScreencast?.page.viewport.height}</>}*/}
            
            {right ? right : <MainTopRight/>}
        </>
    );
});

export const MainBottom = observer(function MainBottom() {
    return (
        <>
            <Button variant={'ghost'} size={'toggle'} className={'text-primary text-xxs uppercase tracking-widest'}><Icon
                name={'error'}
                className={'mr-1'}
            /> Exceptions</Button>
            <Button variant={'ghost'} size={'toggle'} className={'text-primary text-xxs uppercase tracking-widest'}><Icon
                name={'folder'}
                className={'mr-1'}
            /> Files</Button>
        </>
    );
});
