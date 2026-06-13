import _ from 'lodash'
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { HttpRequest } from './defines';

export const parseCookiesAsync = (req: any, secret: string = '') => {
  const parser = cookieParser();
  return new Promise<void>((resolve, reject) => {
    // We pass an empty object for 'res' and 'next' because 
    // cookie-parser doesn't actually use them for simple parsing.
    parser(req, {} as any, (err?: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const getCookie = (request: HttpRequest, name: string) => {
  const cookies = _.get(request, 'cookies', {});
  const cookieValue: string = _.get(cookies, name, '');
  return cookieValue;
}

export default (server: Express) => {
  server.use(cookieParser());
}