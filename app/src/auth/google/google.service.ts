import { HttpService } from "@nestjs/axios";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { GoogleUser } from "./utils/interface/google.interface";

@Injectable()
export class GoogleService {
    constructor(
        private httpService: HttpService,
    ) {}

    /** 구글 엑세스 토큰 재발급 */
    async refreshGoogleToken(refreshToken: string): Promise<string> {
        const url = 'https://oauth2.googleapis.com/token';
        const body = new URLSearchParams();
        body.append('client_id', 'YOUR_CLIENT_ID');
        body.append('client_secret', 'YOUR_CLIENT_SECRET');
        body.append('refresh_token', refreshToken);
        body.append('grant_type', 'refresh_token');
    
        try {
            const response = await firstValueFrom(
                this.httpService.post(url, body.toString(), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                })
            );
            const data = response.data;
            return data.access_token; // 새로 발급받은 액세스 토큰 반환
        } catch (error) {
            console.error('Error refreshing Google token:', error);
            throw new Error('Unable to refresh token');
        }
    }

    async verifyToken(accessToken: string): Promise<boolean> {
        const url = 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + accessToken;
        try {
            const response = await firstValueFrom(this.httpService.get(url));
            return response.status === 200;
        } catch (error) {
            console.error('Invalid access token:', error);
            return false;
        }
    }

    async fetchCalendarEvents(accessToken: string): Promise<any> {
        const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    
        try {
            const response = await firstValueFrom(this.httpService.get(url, {
                headers: {
                'Authorization': `Bearer ${accessToken}`
                }
            }));
        // console.log(response.data.items)
            return response.data.items;
        } catch (error) {
            console.error('Error fetching calendar events:', error.response?.data);
          throw new InternalServerErrorException('Failed to fetch calendar events');
        }
      }
}