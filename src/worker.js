export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === 'www.ecommarketdata.com') {
      url.hostname = 'ecommarketdata.com';
      return Response.redirect(url.toString(), 301);
    }

    return env.ASSETS.fetch(request);
  },
};
