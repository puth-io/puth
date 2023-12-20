import {observer} from "mobx-react-lite";
import puthLogoBlue from "@/assets/puth-logo-blue.png";
import {Button} from "@/components/ui/button.tsx";
import {Icon} from "@/components/icon.tsx";
import {Context} from "@/app/components/Context.tsx";
import {ConnectionDropdown} from "@/app/components/ConnectionDropdown.tsx";
import {QuickConnect} from "@/app/components/QuickConnect.tsx";
import {History} from "@/app/components/History.tsx";

export const Sidebar = observer(function Sidebar({
    title = 'Puth',
    header,
    content,
}: any) {
    return (
        <>
            {/*<div*/}
            {/*    className={'flex items-center px-2 h-12 shrink-0'}*/}
            {/*    style={{borderBottom: '1px solid hsl(var(--input))'}}*/}
            {/*>*/}
            {/*    {header ? header : (<>*/}
            {/*        <div className={'flex items-center'}>*/}
            {/*            <img src={puthLogoBlue} className={'h-5 mr-2'}/>*/}
            {/*            {title}*/}
            {/*        </div>*/}
            {/*        */}
            {/*        <Button size={'icon-xs'} variant={'outline'} className={'ml-auto'}>*/}
            {/*            <Icon name={'settings'}/>*/}
            {/*        </Button>*/}
            {/*        */}
            {/*        <ConnectionDropdown/>*/}
            {/*    </>)}*/}
            {/*</div>*/}
            
            {content ? content : (<>
                <QuickConnect/>
                <Context/>
                <History/>
            </>)}
        </>
    );
});
