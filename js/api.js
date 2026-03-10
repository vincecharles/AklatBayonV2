/**
 * API Client — thin wrapper around fetch() for the Netlify serverless API.
 * Drop-in replacement interface for the localStorage Store methods.
 */
var Api = (function () {
    // Base path — works on same origin (Netlify), no absolute URL needed
    var BASE = '/api';

    function _url(collection, id) {
        var path = BASE + '/' + collection;
        if (id) path += '/' + id;
        return path;
    }

    function _handleResponse(resp) {
        return resp.json().then(function (body) {
            if (!resp.ok) {
                return Promise.reject({ message: body.error || 'Request failed (' + resp.status + ')' });
            }
            return body;
        });
    }

    /** GET /api/{collection} — list all (with optional query params) */
    function getAll(collection, params) {
        var url = _url(collection);
        if (params) {
            var qs = Object.keys(params).map(function (k) {
                return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
            }).join('&');
            if (qs) url += '?' + qs;
        }
        return fetch(url).then(_handleResponse).then(function (body) { return body.data; });
    }

    /** GET /api/{collection}/{id} — single record */
    function getById(collection, id) {
        return fetch(_url(collection, id)).then(_handleResponse).then(function (body) { return body.data; });
    }

    /** POST /api/{collection} — create */
    function create(collection, item) {
        return fetch(_url(collection), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        }).then(_handleResponse);
    }

    /** PUT /api/{collection}/{id} — update */
    function update(collection, id, updates) {
        return fetch(_url(collection, id), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        }).then(_handleResponse);
    }

    /** DELETE /api/{collection}/{id} — remove */
    function remove(collection, id) {
        return fetch(_url(collection, id), {
            method: 'DELETE'
        }).then(_handleResponse);
    }

    /** POST /api/seed — trigger database seed */
    function seed() {
        return fetch(BASE + '/seed', { method: 'POST' }).then(_handleResponse);
    }

    return {
        getAll: getAll,
        getById: getById,
        create: create,
        update: update,
        remove: remove,
        seed: seed
    };
})();
