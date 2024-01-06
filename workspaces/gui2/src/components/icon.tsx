export const Icon = function ({name, size, className}: {name: string, size?: string, className?: string}) {
    return (
        <span className={'material-symbols-rounded ' + (className ?? '')} style={{fontSize: size ?? undefined}}>{ name }</span>
    );
};
