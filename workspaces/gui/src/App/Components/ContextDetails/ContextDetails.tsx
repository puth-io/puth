// @ts-nocheck
import React from 'react';
import {observer} from 'mobx-react-lite';
import PreviewStore from "../../Mobx/PreviewStore";

export const ContextDetails = observer(({context}) => {
    if (! context) {
        context = PreviewStore.activeContext;
    }
    if (! context) {
        return <></>;
    }
    
    return (
        <div className={'d-flex flex-column border-left border-default bg-dark-5'}>
            <div className={'footer'}>
                <div className={'ml-auto'}>{context && `Context: ${context?.id}`}</div>
            </div>
        </div>
    );
});
