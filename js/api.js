/**
 * API Client — thin wrapper around fetch() for the Netlify serverless API.
 * Drop-in replacement interface for the localStorage Store methods.
 */
const Api = (() => {
    const BASE = '/api';

    const _url = (collection, id) => {
        let path = `${BASE}/${collection}`;
        if (id) path += `/${id}`;
        return path;
    };

    const _handleResponse = (resp) =>
        resp.json().then((body) => {
            if (!resp.ok) {
                return Promise.reject({ message: body.error || `Request failed (${resp.status})` });
            }
            return body;
        });

    const getAll = (collection, params) => {
        let url = _url(collection);
        if (params) {
            const qs = Object.keys(params)
                .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
                .join('&');
            if (qs) url += `?${qs}`;
        }
        return fetch(url).then(_handleResponse).then((body) => body.data);
    };

    const getById = (collection, id) =>
        fetch(_url(collection, id)).then(_handleResponse).then((body) => body.data);

    const create = (collection, item) =>
        fetch(_url(collection), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        }).then(_handleResponse);

    const update = (collection, id, updates) =>
        fetch(_url(collection, id), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        }).then(_handleResponse);

    const remove = (collection, id) =>
        fetch(_url(collection, id), { method: 'DELETE' }).then(_handleResponse);

    const seed = () =>
        fetch(`${BASE}/seed`, { method: 'POST' }).then(_handleResponse);

    return { getAll, getById, create, update, remove, seed };
})();
