import React, { FunctionComponent } from 'react';
import './Request.scss';

type RequestProps = {
  request: any;
};

const Request: FunctionComponent<RequestProps> = ({ request }) => {
  let took = request.response.time.finished - request.time;

  return (
    <tr className={'request'} data-status={request.status}>
      <td />

      <td className={''}>
        {request.status === 'finished' ? (request.response.time.elapsed / 1000).toFixed(1) + 's' : '-'}
        {took > 250 && (
          <div>
            <span className={'text-warning-dark'}>{(took / 1000).toFixed(1)}s</span>
          </div>
        )}
      </td>
      <td>(XHR)</td>
      <td colSpan={3} className={'text-break-all'}>
        <span className={'text-warning-dark fw-bold'}>{request.method}</span>{' '}
        {request.url.length > 64 ? request.url.substring(0, 60) + '...' : request.url}
      </td>
    </tr>
  );
};

export default Request;
