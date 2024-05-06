// dialog_service.dart

import 'package:calendar/api/event_creates_service.dart';
import 'package:calendar/api/kakao_auth_service.dart';
import 'package:calendar/controllers/calendar_controller.dart';
import 'package:calendar/controllers/meeting_controller.dart';
import 'package:calendar/screens/sync_login_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:syncfusion_flutter_calendar/calendar.dart';

class DialogService {
  static void showAddAppointmentDialog(
    BuildContext context,
    DateTime selectedDate,
    Color color,
    String calendarId,
  ) {
    final TextEditingController _subjectController = TextEditingController();
    DateTime _selectedStartTime = selectedDate;
    DateTime _selectedEndTime = selectedDate.add(Duration(hours: 1));
    final MeetingController meetingController = Get.find<MeetingController>();

    void _updateTime(bool isStartTime, DateTime updatedTime) {
      if (isStartTime) {
        _selectedStartTime = updatedTime;
      } else {
        _selectedEndTime = updatedTime;
      }
    }

    Future<void> _pickDateTime(BuildContext context, bool isStartTime) async {
      final TimeOfDay? pickedTime = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(
            isStartTime ? _selectedStartTime : _selectedEndTime),
      );
      if (pickedTime != null) {
        final updatedDateTime = DateTime(
          _selectedStartTime.year,
          _selectedStartTime.month,
          _selectedStartTime.day,
          pickedTime.hour,
          pickedTime.minute,
        );
        _updateTime(isStartTime, updatedDateTime);
      }
    }

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Add Appointment'),
          content: SingleChildScrollView(
            child: Column(
              children: <Widget>[
                TextField(
                  controller: _subjectController,
                  decoration: const InputDecoration(labelText: "Subject"),
                ),
                ListTile(
                  leading: const Icon(Icons.timer),
                  title: const Text("Start Time"),
                  subtitle: Text(DateFormat('yyyy-MM-dd HH:mm')
                      .format(_selectedStartTime)),
                  onTap: () => _pickDateTime(context, true),
                ),
                ListTile(
                  leading: const Icon(Icons.timer_off),
                  title: const Text("End Time"),
                  subtitle: Text(
                      DateFormat('yyyy-MM-dd HH:mm').format(_selectedEndTime)),
                  onTap: () => _pickDateTime(context, false),
                ),
              ],
            ),
          ),
          actions: <Widget>[
            TextButton(
              child: const Text('Add'),
              onPressed: () async {
                SharedPreferences prefs = await SharedPreferences.getInstance();
                String? token = prefs.getString('token');

                // 백엔드에 일정 추가 요청
                var result = await CalendarEventService().createEvent(
                  _subjectController.text,
                  _selectedStartTime,
                  _selectedEndTime,
                  calendarId,
                  token!,
                  color,
                );

                if (result['isCreated']) {
                  String groupEventId = result['groupEventId'];
                  Appointment newAppointment = Appointment(
                    startTime: _selectedStartTime,
                    endTime: _selectedEndTime,
                    subject: _subjectController.text,
                    color: color,
                    id: calendarId.toString(),
                  );
                  meetingController.addCalendarAppointment(
                      newAppointment, calendarId, groupEventId);
                  Navigator.pop(context);
                } else {
                  Get.snackbar("Error", "Failed to create event");
                }
              },
            ),
          ],
        );
      },
    );
  }
}

void showSyncLoginPageModal(BuildContext context) {
  showDialog(
    context: context,
    builder: (BuildContext context) {
      return Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ), // 다이얼로그의 모서리를 둥글게
        child: SyncLoginPage(), // SyncLoginPage를 다이얼로그 내용으로 사용
      );
    },
  );
}

void showAddCalendarDialog(BuildContext context) {
  final UserCalendarController calendarController =
      Get.find<UserCalendarController>();
  final calendarNameController =
      TextEditingController(); // 캘린더 이름을 입력 받기 위한 컨트롤러
  Color pickerColor = Colors.blue; // 기본 색상
  Color currentColor = Colors.blue; // 현재 선택된 색상

  // 색상 선택기 다이얼로그를 보여주는 함수
  void changeColor(Color color) {
    pickerColor = color;
  }

  showDialog(
    context: context,
    builder: (BuildContext context) {
      return AlertDialog(
        title: const Text('캘린더 추가'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              TextField(
                controller: calendarNameController,
                decoration: const InputDecoration(hintText: "캘린더 이름"),
              ),
              ListTile(
                title: const Text("색상 선택"),
                leading: Icon(Icons.color_lens, color: currentColor),
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (BuildContext context) {
                      return AlertDialog(
                        title: const Text("색상 선택"),
                        content: SingleChildScrollView(
                          child: ColorPicker(
                            pickerColor: pickerColor,
                            onColorChanged: changeColor,
                            pickerAreaHeightPercent: 0.8,
                          ),
                        ),
                        actions: <Widget>[
                          TextButton(
                            child: const Text('저장'),
                            onPressed: () {
                              currentColor = pickerColor;
                              Navigator.of(context).pop();
                            },
                          ),
                        ],
                      );
                    },
                  );
                },
              ),
            ],
          ),
        ),
        actions: <Widget>[
          TextButton(
            child: const Text('추가'),
            onPressed: () async {
              await calendarController.addCalendar(
                calendarNameController.text,
                currentColor, // 색상 정보 추가
              );
              Navigator.of(context).pop();
            },
          ),
        ],
      );
    },
  );
}

Widget syncButton() {
  final KakaoAuthService kakaoAuthService = Get.find<KakaoAuthService>();
  return ListTile(
    title: const Text('동기화 하기'),
    trailing: const Icon(Icons.sync),
    onTap: () async {
      SharedPreferences prefs = await SharedPreferences.getInstance();
      String? jwtToken = prefs.getString('token');
      String? accessToken = prefs.getString('kakaoAccessToken');
      String? refreshToken = prefs.getString('kakaoRefreshToken');

      if (jwtToken != null && accessToken != null) {
        kakaoAuthService.sendTokensToServer(
            jwtToken, accessToken, refreshToken);
      } else {
        print('No token available for syncing');
      }
    },
  );
}
