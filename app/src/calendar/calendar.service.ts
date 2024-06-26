import { HttpException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Calendar } from './entities/calendar.entity';
import { Repository, getManager } from 'typeorm';
import { CalendarCreateDto } from './dtos/calendar.create.dto';
import { PayloadResponse } from 'src/auth/dtos/payload-response';
import { UserCalendarService } from 'src/db/user_calendar/userCalendar.service';
import { CalendarUpdateDto } from './dtos/calendar.update.dto';
import { GroupEvent } from 'src/db/event/group_event/entities/groupEvent.entity';
import { UserCalendar } from 'src/db/user_calendar/entities/userCalendar.entity';
import { UtilsService } from 'src/utils/utils.service';
import { User } from 'src/db/user/entities/user.entity';

@Injectable()
export class CalendarService {
    constructor(
        @InjectRepository(Calendar)
        private calendarRepository: Repository<Calendar>,
        @InjectRepository(GroupEvent)
        private groupEventRepository: Repository<GroupEvent>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(UserCalendar)
        private userCalendarRepository: Repository<UserCalendar>,
        private userCalendarService: UserCalendarService,
        private readonly utilsService: UtilsService,
    ) { }

    async createGroupCalendar(body: CalendarCreateDto, payload: PayloadResponse): Promise<Calendar> {
        const { title, type } = body;

        const author = await this.userCalendarRepository.findOne({ where: { userCalendarId: payload.userCalendarId } });
        if (!author) {
            throw new NotFoundException("UserCalendar not found");
        }

        const newGroupCalendar = new Calendar();
        newGroupCalendar.calendarId = this.utilsService.getUUID();
        newGroupCalendar.title = title;
        newGroupCalendar.type = type;
        newGroupCalendar.attendees = [payload.userCalendarId];
        newGroupCalendar.author = author;
        console.log(newGroupCalendar);
        console.log(author);
        // Group calendar is created by the author
        author.groupCalendars.push(newGroupCalendar.calendarId);

        try {
            const savedGroupCalendar = await this.calendarRepository.save(newGroupCalendar);
            await this.userCalendarRepository.save(author);
            return savedGroupCalendar;
        } catch (e) {
            console.error('Error saving group calendar:', e);
            throw new InternalServerErrorException('Error saving group calendar');
        }
    }

    async updateGroupCalendar(calendarId: string, body: CalendarUpdateDto, payload: PayloadResponse): Promise<Calendar> {
        // Ensure payload is not null and has all required properties
        if (!payload || typeof payload.userCalendarId !== 'string') {
            throw new Error('Invalid payload: Payload is missing or userCalendarId is not provided');
        }
        // Using QueryBuilder to safely query arrays with parameters
        const calendar = await this.calendarRepository.createQueryBuilder("calendar")
            .where("calendar.calendarId = :calendarId", { calendarId })
            .andWhere(":userCalendarId = ANY(calendar.attendees)", { userCalendarId: payload.userCalendarId })
            .getOne();
        if (!calendar) {
            throw new NotFoundException(`Calendar with ID ${calendarId} not found`);
        }
        // if (calendar.author?.userCalendarId !== payload.userCalendarId) {
        //     throw new ForbiddenException("You do not have permission to update this calendar.");
        // }

        // Update fields if they are present in the body
        if (body.title) {
            calendar.title = body.title;
        }
        if (body.type) {
            calendar.type = body.type;
        }

        // Try to save the updated calendar
        try {
            return await this.calendarRepository.save(calendar);
        } catch (e) {
            console.error("Error updating calendar:", e);
            throw new InternalServerErrorException('Error updating group calendar');
        }
    }

    async findCalendarsByUserCalendarId(userCalendarId: string): Promise<Calendar[]> {
        try {
            const calendars = await this.calendarRepository
                .createQueryBuilder("calendar")
                .leftJoinAndSelect("calendar.author", "author")
                .where("author.userCalendarId = :userCalendarId", { userCalendarId })
                .andWhere("calendar.isDeleted = false")
                .orWhere(":userCalendarId = ANY(calendar.attendees)", { userCalendarId })
                .andWhere("calendar.isDeleted = false")
                .getMany();

            // if (calendars.length === 0) {
            //     throw new NotFoundException(`No calendars found associated with userCalendarId ${userCalendarId}`);
            // }
            return calendars;
        } catch (e) {
            console.error('Error occurred while fetching calendars:', e);
            throw new InternalServerErrorException('Failed to fetch calendars');
        }
    }

    async findCalendarsByUserCalendarIdV2(userCalendarId: string): Promise<any[]> {
        try {
            const calendars = await this.calendarRepository
                .createQueryBuilder("calendar")
                .leftJoinAndSelect("calendar.banner", "banner")
                .leftJoinAndSelect("calendar.author", "author")
                .where("author.userCalendarId = :userCalendarId", { userCalendarId })
                .andWhere("calendar.isDeleted = false")
                .orWhere(":userCalendarId = ANY(calendar.attendees)", { userCalendarId })
                .andWhere("calendar.isDeleted = false")
                .getMany();

            if (calendars.length === 0) {
                console.log("No calendars found for the given user calendar ID.");
                return [];
            }

            const calendarDetails = await Promise.all(calendars.map(async calendar => {
                if (!calendar.attendees || calendar.attendees.length === 0) {
                    return {
                        calendarId: calendar.calendarId,
                        title: calendar.title,
                        coverImg: calendar.coverImage,
                        type: calendar.type,
                        attendees: []
                    };
                }
                const attendeesInfo = await this.userCalendarRepository
                    .createQueryBuilder("usercalendar")
                    .leftJoinAndSelect("usercalendar.user", "user")
                    .select([
                        "usercalendar.userCalendarId",
                        "user.nickname",
                        "user.useremail",
                        "user.thumbnail"
                    ])
                    .where("usercalendar.userCalendarId IN (:...userCalendarIds)", { userCalendarIds: calendar.attendees })
                    .getMany();

                console.log(calendar.banner);

                if (calendar.banner) {
                    return {
                        calendarId: calendar.calendarId,
                        title: calendar.title,
                        coverImg: calendar.coverImage,
                        bannerImg: calendar.banner.webBannerUrl,
                        type: calendar.type,
                        createdAt: calendar.registeredAt,
                        attendees: attendeesInfo.map(usercalendar => ({
                            nickname: usercalendar.user.nickname,
                            useremail: usercalendar.user.useremail,
                            thumbnail: usercalendar.user.thumbnail
                        }))
                    };
                }
                return {
                    calendarId: calendar.calendarId,
                    title: calendar.title,
                    coverImg: calendar.coverImage,
                    type: calendar.type,
                    createdAt: calendar.registeredAt,
                    attendees: attendeesInfo.map(usercalendar => ({
                        nickname: usercalendar.user.nickname,
                        useremail: usercalendar.user.useremail,
                        thumbnail: usercalendar.user.thumbnail
                    }))
                };
            }));

            return calendarDetails;
        } catch (e) {
            console.error('Error occurred while fetching calendars:', e);
            throw new InternalServerErrorException('Failed to fetch calendars');
        }
    }



    async deleteCalendar(calendarId: string): Promise<void> {
        const calendar = await this.calendarRepository.findOne({
            where: { calendarId },
            relations: ['groupEvents']
        });

        if (!calendar) {
            throw new NotFoundException(`Calendar with ID ${calendarId} not found`);
        }

        calendar.isDeleted = true;
        calendar.deletedAt = new Date();

        if (calendar.groupEvents && calendar.groupEvents.length > 0) {
            for (const event of calendar.groupEvents) {
                event.isDeleted = true;
                event.deletedAt = new Date();
                await this.groupEventRepository.save(event);
            }
        }

        await this.calendarRepository.save(calendar);
    }

    async addAttendeeToCalendar(calendarId: string, payload: PayloadResponse): Promise<string> {
        const [userCalendar, calendar] = await Promise.all([
            this.userCalendarRepository.findOne({
                where: { userCalendarId: payload.userCalendarId },
            }),
            this.calendarRepository.findOne({
                where: { calendarId },
            })
        ]);

        if (!calendar) {
            throw new NotFoundException(`Calendar with ID ${calendarId} not found`);
        }
        if (!userCalendar) {
            throw new NotFoundException(`UserCalendar with ID ${payload.userCalendarId} not found`);
        }

        if (!calendar.attendees.includes(userCalendar.userCalendarId)) {
            calendar.attendees.push(userCalendar.userCalendarId);
            await this.calendarRepository.save(calendar);
            userCalendar.groupCalendars.push(calendar.calendarId);
            await this.userCalendarRepository.save(userCalendar);

            return "Attendee added successfully!";
        } else {
            throw new HttpException('Attendee already exists.', HttpStatus.CONFLICT);
        }
    }

    async removeAttendeeFromCalendar(calendarId: string, userCalendarId: string): Promise<string> {
        const calendar = await this.calendarRepository.createQueryBuilder("calendar")
            .leftJoinAndSelect("calendar.author", "author")
            .where("calendar.calendarId = :calendarId", { calendarId })
            .getOne();
        if (!calendar) {
            throw new NotFoundException(`Calendar with ID ${calendarId} not found`);
        }

        const userCalendar = await this.userCalendarRepository.findOne({ where: { userCalendarId } });
        if (!userCalendar) {
            throw new NotFoundException(`UserCalendar with ID ${userCalendarId} not found`);
        }

        userCalendar.groupCalendars = userCalendar.groupCalendars.filter((id) => id !== calendarId);
        const index = calendar.attendees.indexOf(userCalendarId);
        if (index !== -1) {
            calendar.attendees.splice(index, 1);
            if (calendar.author.userCalendarId === userCalendarId) {
                if (calendar.attendees.length > 0) {
                    const newAuthorId = calendar.attendees[0];
                    const newAuthor = await this.userCalendarService.findOne({ userCalendarId: newAuthorId });
                    console.log(`New Author = ${newAuthor}`);
                    calendar.author = newAuthor;
                } else {
                    calendar.isDeleted = true;
                    calendar.deletedAt = new Date();
                }
            }
            await this.userCalendarRepository.save(userCalendar);
            await this.calendarRepository.save(calendar);
            return "Attendee removed successfully";
        } else {
            throw new HttpException("Attendee does not exist", HttpStatus.CONFLICT);
        }
    }
}
