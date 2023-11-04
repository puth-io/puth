export const Icon = function ({name, className}: {name: string, className?: string}) {
    return (
        <span className={'material-symbols-outlined ' + (className ?? '')}>{ name }</span>
    );
};
