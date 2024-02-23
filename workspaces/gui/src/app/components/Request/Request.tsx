import { FunctionComponent } from 'react';
import './Request.scss';

type RequestProps = {
  request: any;
};

const Request: FunctionComponent<RequestProps> = ({ request }) => {
  let took = request?.response ? request?.response?.time?.finished - request.time : 0;

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
      <td>{request.resourceType}</td>
      <td colSpan={3} className={'ellipsis'}>
        <span>{request.url}</span>
      </td>
    </tr>
  );
};

export default Request;
