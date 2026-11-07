import {
    AlertCircle,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    CircleDashed,
    CloudOff,
    Compass,
    Download,
    Folder,
    History,
    Loader2,
    RefreshCw,
    Settings,
    Timer,
    X,
    XCircle,
    Zap,
} from 'lucide-react';

const icons = {
    bolt: Zap,
    cancel: XCircle,
    check: Check,
    check_circle: CheckCircle2,
    close: X,
    cloud_off: CloudOff,
    download: Download,
    error: AlertCircle,
    expand_less: ChevronUp,
    expand_more: ChevronDown,
    explore: Compass,
    folder: Folder,
    history: History,
    pending: CircleDashed,
    progress_activity: Loader2,
    refresh: RefreshCw,
    settings: Settings,
    timer: Timer,
};

export type IconName = keyof typeof icons;

export const Icon = ({name, size, className, onClick, ...rest}: {name: IconName, size?: string, className?: string, onClick?: TODO}) => {
    const Component = icons[name];
    
    return <Component size={size ?? '1rem'} className={'inline-block ' + (className ?? '')} onClick={onClick} {...rest}/>;
};
