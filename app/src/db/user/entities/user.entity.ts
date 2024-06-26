import { ApiProperty } from "@nestjs/swagger";
import { Exclude } from "class-transformer";
import { FeedComment } from "src/db/comment/entities/comment.entity";
import { Emoji } from "src/emoji/entities/emoji.entity";
import { UserCalendar } from "src/db/user_calendar/entities/userCalendar.entity";
import { Feed } from "src/feed/entities/feed.entity";
import { BaseEntity, Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { EmojiInFeed } from "src/db/emoji_feed/entities/emoji.feed.entity";
import { UserAccessToken } from "src/db/tokens/entities/userAccessToken.entity";
import { UserRefreshToken } from "src/db/tokens/entities/userRefreshToken.entity";


@Entity()
@Unique(['useremail'])
export class User extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    userId: string;

    @Column({ nullable: false })
    useremail: string;

    @Column({ nullable: false })
    @Exclude()
    password: string;

    @Column({ nullable: true, default: null })
    @Exclude()
    prePwd: string | null;

    @Column({ nullable: true, default: null })
    phone: string | null;

    @Column({ nullable: false })
    nickname: string;

    @Column({ nullable: true, default: null })
    thumbnail: string | null;

    @CreateDateColumn()
    registeredAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    @ApiProperty({ description: 'The date when the user was deleted', example: '2023-01-03T00:00:00.000Z' })
    deletedAt?: Date;

    @Column({ nullable: true })
    birthDay: Date | null;

    @Column({ nullable: false, default: false })
    birthDayFlag: boolean;

    @Column({ default: true })
    isFirst: boolean;

    @OneToOne(() => UserCalendar, userCalendar => userCalendar.user)
    @JoinColumn({ name: 'userCalendarId' })
    userCalendarId: UserCalendar

    @OneToMany(() => Feed, feed => feed.user)
    feeds: Feed[];

    @OneToMany(() => FeedComment, FeedComment => FeedComment.user)
    feedComments: FeedComment[];

    // @OneToMany(() => Emoji, emoji => emoji.user)
    // emojis: Emoji[];

    @OneToMany(() => EmojiInFeed, emojiInFeed => emojiInFeed.user)
    emojisInFeed: EmojiInFeed[];

    @OneToOne(() => UserAccessToken, accessToken => accessToken.user)
    @JoinColumn({ name: 'accessId' })
    accessToken: UserAccessToken;

    @OneToOne(() => UserRefreshToken, refreshToken => refreshToken.user)
    @JoinColumn({ name: 'refreshId' })
    refreshToken: UserRefreshToken;
}