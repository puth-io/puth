import {observer} from "mobx-react-lite";
import {useContext} from "react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Separator} from "@/components/ui/separator.tsx";
import {AppContext} from "@/App.tsx";

export const QuickConnect =  observer(function QuickConnect() {
    const {app} = useContext(AppContext);
    
    if (app.active.connection) {
        return <></>;
    }
    
    return (
        <div className={'p-2'}>
            <Card>
                <CardHeader>
                    <CardTitle>Connect to a Puth instance</CardTitle>
                    <CardDescription>Enter an IP or hostname or select one of the suggestions</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className={'flex'}>
                        <Input placeholder={'IP or hostname'}/>
                        <Button>Connect</Button>
                    </div>
                    <Separator className={'my-4'}/>
                    <p className={'mb-2'}>Directly connect to</p>
                    {app.connectionSuggestions.map((suggestion, idx) => (
                        <Button
                            variant={'secondary'}
                            key={idx}
                            className={'w-full mb-1'}
                            onClick={() => app.tryConnectingTo(suggestion)}
                        >{suggestion}</Button>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
});