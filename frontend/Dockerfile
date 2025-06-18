#base image => nginx
FROM nginx

#to copy source code from host machine to container
COPY . .

#to delete already existing nginx index.html
RUN rm -rf /usr/share/nginx/html/*.html

#to copy our project's index.html to nginx root directory
COPY frontend/index.html /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
