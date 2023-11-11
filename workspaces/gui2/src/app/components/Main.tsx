import {observer} from "mobx-react-lite";
import {Button} from "@/components/ui/button.tsx";
import {Icon} from "@/components/icon.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Toggle} from "@/components/ui/toggle.tsx";
import {useContext} from "react";
import {AppContext} from "@/App.tsx";

export const MainTopButtons = observer(function MainTopButtons() {
    return (
        <>
            {/*<Button size={'xs'} variant={'outline'}>Frame</Button>*/}
            {/*<Button size={'xs'} variant={'outline'} className={'mr-2'}>Dom</Button>*/}
            
            <Button size={'icon-xs'} variant={'outline'}><Icon name={'autoplay'}/></Button>
            <Button size={'xs'} variant={'outline'}>Before</Button>
            <Button size={'xs'} variant={'outline'} className={'mr-2'}>After</Button>
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
    const {preview} = useContext(AppContext);
    
    return (
        <>
            {left ? left : <MainTopButtons/>}
            
            <Input
                className={'h-8 grow mr-2'}
                value={preview.visibleScreencast?.page?.url ?? ''}
                disabled
            />
            
            {preview.visibleScreencast && <><Icon
                name={'screenshot_monitor'}
                className={'mr-1'}
            /> {preview.visibleScreencast?.page.viewport.width}x{preview.visibleScreencast?.page.viewport.height}</>}
            
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
