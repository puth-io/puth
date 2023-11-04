import {Button} from "@/components/ui/button";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {Icon} from "@/components/icon.tsx";
import {Input} from "@/components/ui/input";
import {Toggle} from "@/components/ui/toggle.tsx";

// tailwind include: dark

function App() {
    return (
        <>
            <div className={'grid grid-cols-[500px_1fr] h-screen w-screen'}>
                <div style={{background: '#313438', borderRight: '1px solid #3d4249'}}>
                    <div className={'flex items-center px-2 h-12'}>
                        <div>Puth</div>
                        
                        <Button size={'icon-xs'} variant={'outline'} className={'ml-auto'}>
                            <Icon name={'settings'}/>
                        </Button>
                        
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button size={'xs'} variant={'outline'} className={'ml-1'}>
                                    <Icon name={'cloud'} className={'mr-2 text-green-300'}/>
                                    ws://localhost:7345
                                    <Icon name={'expand_more'} className={'ml-2 text-xs'}/>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                                Hallo
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                
                <div className="flex flex-col grow">
                    <div className={'shrink flex items-center h-12 px-2'} style={{borderBottom: '1px solid #3d4249'}}>
                        <Button size={'icon-xs'} variant={'outline'} className={''}><Icon name={'autoplay'}/></Button>
                        <Button size={'xs'} variant={'outline'} className={''}>Before</Button>
                        <Button size={'xs'} variant={'outline'} className={'mr-2'}>After</Button>
                        
                        <Input className={'h-8 grow'} value={'https://puth-web-preview-1.fly.dev/'} disabled/>
                        
                        <Toggle size={'xs'} className={'ml-2'}><Icon name={'dark_mode'}/></Toggle>
                    </div>
                    
                    <div className={'grow p-2'}>
                        preview container
                    </div>
                    
                    <div className={'shrink flex'} style={{borderTop: '1px solid #3d4249'}}>
                        <Button variant={'ghost'} size={'toggle'}>Exceptions</Button>
                        <Button variant={'ghost'} size={'toggle'}>Files</Button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default App;
