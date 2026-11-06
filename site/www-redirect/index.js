// 301s www.gigaflush.com/* to https://gigaflush.com/*, keeping path and query.
export default {
  fetch(request) {
    const url = new URL(request.url);
    url.hostname = "gigaflush.com";
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  },
};
