import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { CreateGroupEventDTO } from "./dtos/groupEvent.create.dto";
import { PayloadResponse } from "src/auth/dtos/payload-response";
import { GroupEvent } from "./entities/groupEvent.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Calendar } from "src/calendar/entities/calendar.entity";
import { GetGroupDTO, MemberInfo } from "./dtos/groupEvent.get.dto";
import { User } from "src/db/user/entities/user.entity";
import { UserCalendar } from "src/db/user_calendar/entities/userCalendar.entity";


@Injectable()
export class GroupEventService {
    constructor(
        @InjectRepository(GroupEvent)
        private readonly groupEventRepository: Repository<GroupEvent>,
        @InjectRepository(UserCalendar)
        private readonly userCalendarRepository: Repository<UserCalendar>,
        @InjectRepository(Calendar)
        private readonly calendarRepository: Repository<Calendar>,
        @InjectRepository(User)
        private userRepository: Repository<User>
    ) { }

    async createGroupEvent(
        userCreateGroupEventDTO: CreateGroupEventDTO,
        payload: PayloadResponse,
        calendarId: string
    ): Promise<GroupEvent> {
        const calendar = await this.calendarRepository.findOneBy({ calendarId: calendarId });
        if (!calendar) {
            throw new NotFoundException('Calendar not found');
        }
        if (!calendar.attendees.includes(payload.userCalendarId)) {
            throw new ForbiddenException('You do not have permission to add an event to this calendar');
        }

        const groupEvent = new GroupEvent();
        groupEvent.author = payload.useremail;
        groupEvent.calendarId = calendarId;

        const { title, color, startAt, endAt, member } = userCreateGroupEventDTO;
        groupEvent.title = title;
        groupEvent.color = color;
        groupEvent.startAt = startAt;
        groupEvent.endAt = endAt;
        groupEvent.member = member;

        try {
            const savedGroupEventEvent = await this.groupEventRepository.save(groupEvent);
            return savedGroupEventEvent;
        } catch (e) {
            console.error('Error saving group calendar:', e);
            throw new InternalServerErrorException('Error saving group event');
        }

    }

    async getAllGroupEventsByCalendarId(CalendarId: string): Promise<GroupEvent[]> {
        try {
            console.log(CalendarId)
            const groupEvents = await this.groupEventRepository.find({
                where: {
                    calendarId: CalendarId,
                    isDeleted: false
                },
                order: {
                    startAt: 'ASC'
                }
            });
            return groupEvents;
        }
        catch (e) {
            throw new InternalServerErrorException(`Failed to fetch group events for calendar ID ${CalendarId}`);
        }
    }

    async getAllGroupEventsByCalendarIdV2(calendarId: string): Promise<any> {
        try {
            const today = new Date();
            const fortyFiveDaysAgo = new Date();
            fortyFiveDaysAgo.setDate(today.getDate() - 45);
            const fortyFiveDaysLater = new Date();
            fortyFiveDaysLater.setDate(today.getDate() + 45);

            const calendar = await this.calendarRepository.findOne({
                where: {
                    calendarId: calendarId,
                    isDeleted: false
                },
                select: ['calendarId', 'title', 'coverImage', 'bannerImage', 'type']
            });

            if (!calendar) {
                throw new InternalServerErrorException(`No calendar found with ID ${calendarId}`);
            }

            const groupEvents = await this.groupEventRepository
                .createQueryBuilder("groupEvent")
                .where("groupEvent.calendarId = :calendarId", { calendarId })
                .andWhere("groupEvent.isDeleted = false")
                .andWhere("groupEvent.startAt BETWEEN :startDate AND :endDate", {
                    startDate: fortyFiveDaysAgo,
                    endDate: fortyFiveDaysLater
                })
                .orderBy("groupEvent.startAt", "ASC")
                .getMany();

            if (!groupEvents.length) {
                console.log(`No group events found for calendar ID ${calendarId}`);
                return {
                    groupCalendar: {
                        calendarId: calendar.calendarId,
                        title: calendar.title,
                        coverImage: calendar.coverImage,
                        bannerImage: calendar.bannerImage,
                        type: calendar.type,
                        events: []
                    },
                };
            }

            const events = groupEvents.map(event => ({
                groupEventId: event.groupEventId,
                title: event.title,
                startAt: event.startAt,
                endAt: event.endAt,
                member: event.member,
                color: event.color,
                // 이후 추가
                // pinned: event.pinned,
                // alerts: event.alerts,
                // attachment: event.attachment,
            }));

            return {
                groupCalendar: {
                    calendarId: calendar.calendarId,
                    title: calendar.title,
                    coverImage: calendar.coverImage,
                    bannerImage: calendar.bannerImage,
                    type: calendar.type,
                    events: events
                },
            };
        } catch (e) {
            console.error('Error occurred while fetching group events:', e);
            throw new InternalServerErrorException(`Failed to fetch group events for calendar ID ${calendarId}`);
        }
    }


    async getAllGroupEventsByCalendarId2(calendarId: string): Promise<GetGroupDTO[]> {
        try {

            const groupEvents = await this.groupEventRepository.find({
                where: {
                    calendarId,
                    isDeleted: false
                },
                order: {
                    startAt: 'ASC'
                }
            });

            const groupEventDtos: GetGroupDTO[] = await Promise.all(groupEvents.map(async (event) => {
                // Fetch author details
                const user = await this.userRepository.findOne({
                    where: { useremail: event.author },
                    relations: ['userCalendarId']
                })

                if (!user) {
                    console.log("####################################################################")
                    throw new Error(`User with email ${event.author} not found.`);
                }

                const userCalendar = user.userCalendarId;

                console.log(user);
                console.log(userCalendar);

                // const userCalendar = await this.userCalendarRepository.findOne({
                //     where: { userCalendarId: event.author },
                //     relations: ['user']
                // });

                if (!userCalendar) {
                    throw new Error(`Author with email ${event.author} not found.`);
                }

                const authorInfo: MemberInfo = {
                    useremail: user?.useremail,
                    thumbnail: user?.thumbnail,
                    nickname: user?.nickname
                };

                // Fetch member details
                const memberInfos: MemberInfo[] = await Promise.all(event.member.map(async (memberEmail) => {
                    const user = await this.userRepository.findOne({
                        where: { useremail: memberEmail }
                    });

                    return {
                        useremail: user?.useremail,
                        thumbnail: user?.thumbnail,
                        nickname: user?.nickname
                    };
                }));

                return {
                    groupEventId: event.groupEventId,
                    author: authorInfo,
                    member: memberInfos,
                    title: event.title,
                    color: event.color,
                    pinned: event.pinned,
                    alerts: event.alerts,
                    attachment: event.attachment,
                    createdAt: event.createdAt,
                    updatedAt: event.updatedAt,
                    startAt: event.startAt,
                    endAt: event.endAt,
                    deletedAt: event.deletedAt,
                    isDeleted: event.isDeleted
                };
            }));

            return groupEventDtos;
        } catch (e) {
            throw new InternalServerErrorException(`Failed to fetch group events for calendar ID ${calendarId}: ${e.message}`);
        }
    }



    async getGroupEvent(groupEventId: string): Promise<GroupEvent> {

        try {

            const groupEvent = await this.groupEventRepository.findOne({
                where: {
                    groupEventId: groupEventId, isDeleted: false
                },

            });

            if (!groupEvent) {
                throw new Error('Group event not found');
            }
            return groupEvent;


        } catch (e) {
            console.error('Error occurred:', e);
            throw new InternalServerErrorException('Failed to deactivate group event');
        }
    }

    async getGroupEventUpdateForm(groupEventId: string): Promise<GroupEvent> {
        try {
            console.log(groupEventId);
            const groupEventToUpdate = await this.groupEventRepository.findOne({ where: { groupEventId: groupEventId } });
            console.log(groupEventToUpdate);

            if (!groupEventToUpdate) {
                throw new Error('Group event not found');
            }
            return groupEventToUpdate;
        } catch (e) {
            throw new InternalServerErrorException('Failed to modify group event');
        }
    }

    async updateGroupEvent(groupEventId: string, updateData: Partial<GroupEvent>): Promise<GroupEvent> {
        try {
            const groupEventToUpdate = await this.groupEventRepository.findOne({ where: { groupEventId } });

            if (!groupEventToUpdate) {
                throw new NotFoundException('Group event not found');
            }

            const updatedGroupEvent = this.groupEventRepository.merge(groupEventToUpdate, updateData);
            updatedGroupEvent.updatedAt = new Date();
            return await this.groupEventRepository.save(updatedGroupEvent);
        } catch (e) {
            console.error('Error occurred while updating the group event:', e);
            throw new InternalServerErrorException('Failed to modify group event');
        }
    }

    async removeGroupEvent(groupEventId: string): Promise<GroupEvent> {
        try {
            const groupEvent = await this.groupEventRepository.findOne({
                where: { groupEventId },
            });

            if (!groupEvent) {
                throw new NotFoundException('Group event not found');
            }

            if (groupEvent.isDeleted) {
                throw new Error('Group event is already marked as deleted');
            }

            groupEvent.isDeleted = true;
            groupEvent.deletedAt = new Date();

            const updatedGroupEvent = await this.groupEventRepository.save(groupEvent);
            return updatedGroupEvent;
        } catch (e) {
            console.error('Error occurred:', e);
            throw new InternalServerErrorException('Failed to mark group event as deleted');
        }
    }

    async findOne(data: Partial<GroupEvent>): Promise<GroupEvent> {
        const groupEvent = await this.groupEventRepository.findOneBy({ groupEventId: data.groupEventId });
        if (!groupEvent) {
            throw new UnauthorizedException('Could not find group event');
        }
        return groupEvent;
    }

}

