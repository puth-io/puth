export const Icon = function ({name, className}: {name: string, className?: string}) {
    return (
        <span className={'material-symbols-rounded ' + (className ?? '')}>{ name }</span>
    );
};
