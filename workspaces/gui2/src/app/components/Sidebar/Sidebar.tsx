import './Sidebar.scss';
import {observer} from 'mobx-react-lite';
import PreviewStore from "../../store/PreviewStore";
import Events from '../../Events';
import {Resizable} from 're-resizable';
import puthLogoNew from '../../../assets/puth-logo-new.png';
import AppStore from "@/app/store/AppStore.tsx";

export const SidebarAction = observer(() => {
    let clear = () => {
        PreviewStore.clear();
        AppStore.active.connection?.clear();
    };
    
    return (
        <div className={'height-3 d-flex align-items-center ps-2 pt-2 pb-2'}>
            {! AppStore.active.connection?.hasNoContexts && (
                <button className={'btn btn-sm btn-outline-primary'} onClick={clear}>
                    Clear
                </button>
            )}
        </div>
    );
});

export default observer(function Sidebar({suffix, buttons, extra, children, hideHeader = false}: any) {
    return (
        <Resizable
            className={'d-flex flex-column pe-2'}
            defaultSize={{
                width: 550,
                height: '100%',
            }}
            minWidth={400}
            enable={{right: true}}
            onResizeStop={() => Events.emit('layout:resize')}
        >
            {! hideHeader && (
                <div className="d-flex align-items-center" style={{height: '3rem'}}>
                    <div className="d-flex align-items-center ms-2 me-auto">
                        <img src={puthLogoNew} className={'align-self-center'} style={{height: '18px'}} alt=""/>
                        <span className={'ms-2 text-accent'} style={{fontSize: '1.2rem'}}>
                        Puth {suffix}
                    </span>
                        {buttons}
                    </div>
                    {extra}
                </div>
            )}
            <div className={'sidebar px-2'}>
                {children}
            </div>
        </Resizable>
    );
});
