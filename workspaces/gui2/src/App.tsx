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
                <div className={'flex flex-col min-h-0 grow'} style={{background: '#313438', borderRight: '1px solid #3d4249'}}>
                    <div className={'flex items-center px-2 h-12 shrink-0'} style={{borderBottom: '1px solid hsl(var(--input))'}}>
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
                    
                    <div className={'flex items-center p-2'} style={{borderBottom: '1px solid hsl(var(--input))'}}>
                        <div className={'grow flex items-center'}><Icon name={'check'} className={'mr-1'}/> Example Test</div>
                        <div className={'flex items-center text-gray-300 italic ml-auto'}><Icon name={'timer'}/> 00:54s</div>
                        <div className={'flex items-center text-gray-300 italic ml-2 mr-2'}><Icon name={'history'}/> 1min</div>
                        <Button variant={'outline'} size={'icon-xs'}><Icon name={'download'}/></Button>
                    </div>
                    
                    <div className={'grow overflow-y-auto'}>
                        <table className="table-auto w-full">
                            <tbody className={'divide-y divide-gray-700'}>
                            <tr>
                                <td className={'pl-2'}>1</td>
                                <td>Page</td>
                                <td>get</td>
                                <td className={'pr-2'}>#test</td>
                            </tr>
                            <tr style={{background: '#ffffff17'}}>
                                <td className={'pl-2'}>2</td>
                                <td>Page</td>
                                <td>get</td>
                                <td className={'pr-2'}>#test</td>
                            </tr>
                            <tr>
                                <td className={'pl-2'}>3</td>
                                <td>Page</td>
                                <td>get</td>
                                <td className={'pr-2'}>#test</td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div>
                        <div className={'p-2 flex items-center'} style={{borderTop: '1px solid hsl(var(--input))', maxHeight: '500px'}}>
                            <Input className={'h-8'} placeholder={'Filter history'}/>
                            
                            <Button variant={'outline'} size={'xs'} className={'ml-auto'}><Icon name={'filter_alt'} className={'mr-1'}/> Failed</Button>
                            <Button variant={'outline'} size={'xs'}><Icon name={'upload'} className={'mr-1'}/> Import</Button>
                            <Button variant={'outline'} size={'xs'}>Clear</Button>
                        </div>
                        
                        <div className={'py-2 grow pb-2 overflow-y-auto'} style={{marginRight: '0.125rem', borderTop: '1px solid hsl(var(--input))', maxHeight: '500px'}}>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> just now</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'close'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem', background: '#ffffff17'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                            <div className={'flex pl-2 items-center'} style={{paddingRight: '0.375rem'}}><Icon name={'check'} className={'mr-1'}/> Example Test <div className={'flex items-center text-gray-400 italic ml-auto'}><Icon name={'history'}/> 1min</div></div>
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col grow">
                    <div className={'shrink flex items-center h-12 px-2'} style={{borderBottom: '1px solid #3d4249'}}>
                        
                        <Button size={'xs'} variant={'outline'}>Frame</Button>
                        <Button size={'xs'} variant={'outline'} className={'mr-2'}>Dom</Button>
                        
                        <Button size={'icon-xs'} variant={'outline'}><Icon name={'autoplay'}/></Button>
                        <Button size={'xs'} variant={'outline'}>Before</Button>
                        <Button size={'xs'} variant={'outline'} className={'mr-2'}>After</Button>
                        
                        
                        <Input className={'h-8 grow'} value={'https://puth-web-preview-1.fly.dev/'} disabled/>
                        
                        <Toggle size={'xs'} className={'ml-2'}><Icon name={'dark_mode'}/></Toggle>
                    </div>
                    
                    <div className={'grow p-2'}>
                        <img src="https://assets-global.website-files.com/6009ec8cda7f305645c9d91b/602f2109a787c146dcbe2b66_601b1c1f7567a7399353fe47_traackr.jpeg" alt=""/>
                    </div>
                    
                    <div className={'shrink flex'} style={{borderTop: '1px solid #3d4249'}}>
                        <Button variant={'ghost'} size={'toggle'}><Icon name={'error'} className={'mr-1'}/> Exceptions</Button>
                        <Button variant={'ghost'} size={'toggle'}><Icon name={'folder'} className={'mr-1'}/> Files</Button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default App;
