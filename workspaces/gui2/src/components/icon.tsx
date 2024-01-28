export const Icon = ({name, size, className, ...rest}: {name: string, size?: string, className?: string}) => (
    <span
        className={'material-symbols-rounded ' + (className ?? '')}
        style={{fontSize: size ?? undefined}}
        {...rest}
    >{name}</span>
);
