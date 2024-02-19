export const Icon = ({name, size, className, onClick, ...rest}: {name: string, size?: string, className?: string, onClick?: TODO}) => (
    <span
        className={'material-symbols-rounded ' + (className ?? '')}
        style={{fontSize: size ?? undefined}}
        onClick={onClick}
        {...rest}
    >{name}</span>
);
