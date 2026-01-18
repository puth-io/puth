import {loader} from 'fumadocs-core/source';
import {docs} from 'fumadocs-mdx:collections/server';
import {createElement} from "react";
import * as icons from 'lucide-react';

export const source = loader({
    source: docs.toFumadocsSource(),
    baseUrl: '/docs',
    icon(icon) {
        if (! icon) {
            // You may set a default icon
            return;
        }
        if (icon in icons) return createElement(icons[icon as keyof typeof icons]);
    },
});
