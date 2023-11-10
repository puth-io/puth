import {observer} from "mobx-react-lite";
import {useContext} from "react";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Icon} from "@/components/icon.tsx";
import {AppContext} from "@/App.tsx";

export const ConnectionDropdown = observer(function ConnectionDropdown() {
    const {app} = useContext(AppContext);
    
    if (!app.active.connection) {
        return <></>;
    }
    
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button size={'xs'} variant={'outline'} className={'ml-1'}>
                    <Icon name={'cloud'} className={'mr-2'}/>
                    {app.active.connection?.uri}
                    <Icon name={'expand_more'} className={'ml-2 text-xs'}/>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                Hallo
            </PopoverContent>
        </Popover>
    );
});
