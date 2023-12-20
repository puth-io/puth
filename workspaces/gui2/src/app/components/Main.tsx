import {observer} from "mobx-react-lite";
import {Button} from "@/components/ui/button.tsx";
import {Icon} from "@/components/icon.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Toggle} from "@/components/ui/toggle.tsx";
import {useContext} from "react";
import {AppContext} from "@/App.tsx";

export const MainTopButtons = observer(function MainTopButtons() {
    const {app} = useContext(AppContext);
    
    let setScreencastMode = (mode: 'replay'|'before'|'after') => {
        if (!app.active.connection.preview.screencast) {
            return;
        }
        app.active.connection.preview.screencast.mode = mode;
    }
    
    return (
        <>
            {/*<Button size={'xs'} variant={'outline'}>Frame</Button>*/}
            {/*<Button size={'xs'} variant={'outline'} className={'mr-2'}>Dom</Button>*/}
            
            {/*<Button*/}
            {/*    size={'icon-xs'}*/}
            {/*    variant={'outline'}*/}
            {/*    active={app.active.connection?.preview?.screencast.mode === 'replay'}*/}
            {/*    onClick={() => setScreencastMode('replay')}*/}
            {/*><Icon name={'autoplay'}/></Button>*/}
            <Button
                size={'xs'}
                variant={'outline'}
                active={app.active.connection?.preview?.screencast.mode === 'replay'}
                onClick={() => setScreencastMode('replay')}
            >REPLAY</Button>
            <Button
                size={'xs'}
                variant={'outline'}
                active={app.active.connection?.preview?.screencast.mode === 'before'}
                onClick={() => setScreencastMode('before')}
            >BEFORE</Button>
            <Button
                size={'xs'}
                variant={'outline'}
                active={app.active.connection?.preview?.screencast.mode === 'after'}
                onClick={() => setScreencastMode('after')}
                className={'mr-2'}
            >AFTER</Button>
        </>
    );
});

export const MainTopRight = observer(function MainTopRight() {
    return (
        <Toggle size={'xs'}><Icon name={'dark_mode'}/></Toggle>
    );
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
                className={'h-8 grow mr-2'}
                value={app.active.connection?.preview?.visibleScreencast?.page?.url ?? ''}
                disabled
            />
            
            {app.active.connection?.preview?.visibleScreencast && <><Icon
                name={'screenshot_monitor'}
                className={'mr-1'}
            /> {app.active.connection?.preview?.visibleScreencast?.page.viewport.width}x{app.active.connection?.preview?.visibleScreencast?.page.viewport.height}</>}
            
            {right ? right : <MainTopRight/>}
        </>
    );
});

export const MainBottom = observer(function MainBottom() {
    return (
        <>
            <Button variant={'ghost'} size={'toggle'}><Icon
                name={'error'}
                className={'mr-1'}
            /> Exceptions</Button>
            <Button variant={'ghost'} size={'toggle'}><Icon
                name={'folder'}
                className={'mr-1'}
            /> Files</Button>
        </>
    );
});
