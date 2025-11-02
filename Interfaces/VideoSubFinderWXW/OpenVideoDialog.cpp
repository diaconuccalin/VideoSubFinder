                              //OpenVideoDialog.cpp//
//////////////////////////////////////////////////////////////////////////////////
//																				//
// License:																		//
//     This software is released into the public domain.  You are free to use	//
//     it in any way you like, except that you may not sell this source code.	//
//																				//
//     This software is provided "as is" with no expressed or implied warranty.	//
//     I accept no liability for any damage or loss of business that this		//
//     software may cause.														//
//																				//
//////////////////////////////////////////////////////////////////////////////////

#include "OpenVideoDialog.h"

enum
{
    ID_BTN_OPENCV = wxID_HIGHEST + 1,
    ID_BTN_FFMPEG,
    ID_BTN_REOPEN,
    ID_BTN_OPEN_PREVIOUS,
    ID_BTN_CANCEL_DIALOG
};

BEGIN_EVENT_TABLE(COpenVideoDialog, wxDialog)
    EVT_BUTTON(ID_BTN_OPENCV, COpenVideoDialog::OnOpenCV)
    EVT_BUTTON(ID_BTN_FFMPEG, COpenVideoDialog::OnFFMPEG)
    EVT_BUTTON(ID_BTN_REOPEN, COpenVideoDialog::OnReopen)
    EVT_BUTTON(ID_BTN_OPEN_PREVIOUS, COpenVideoDialog::OnOpenPrevious)
    EVT_BUTTON(ID_BTN_CANCEL_DIALOG, COpenVideoDialog::OnCancel)
    EVT_CLOSE(COpenVideoDialog::OnClose)
END_EVENT_TABLE()

COpenVideoDialog::COpenVideoDialog(wxWindow* parent)
    : wxDialog(parent, wxID_ANY, wxT("Open Video"), wxDefaultPosition, wxSize(400, 300),
               wxDEFAULT_DIALOG_STYLE | wxRESIZE_BORDER),
      m_selectedMethod(METHOD_NONE)
{
    // Create main sizer
    wxBoxSizer* mainSizer = new wxBoxSizer(wxVERTICAL);

    // Add title/instruction text
    wxStaticText* pTitle = new wxStaticText(this, wxID_ANY,
        wxT("Please select how you would like to open a video:"),
        wxDefaultPosition, wxDefaultSize, wxALIGN_CENTER_HORIZONTAL);
    wxFont titleFont = pTitle->GetFont();
    titleFont.SetPointSize(titleFont.GetPointSize() + 2);
    titleFont.SetWeight(wxFONTWEIGHT_BOLD);
    pTitle->SetFont(titleFont);
    mainSizer->Add(pTitle, 0, wxALL | wxEXPAND, 15);

    // Create button sizer
    wxBoxSizer* buttonSizer = new wxBoxSizer(wxVERTICAL);

    // Create buttons with descriptions
    m_pBtnOpenCV = new wxButton(this, ID_BTN_OPENCV,
        wxT("Open Video (OpenCV)"),
        wxDefaultPosition, wxSize(300, 40));
    buttonSizer->Add(m_pBtnOpenCV, 0, wxALL | wxEXPAND, 5);

    wxStaticText* pDescOpenCV = new wxStaticText(this, wxID_ANY,
        wxT("Use OpenCV library for video decoding"));
    wxFont descFont = pDescOpenCV->GetFont();
    descFont.SetPointSize(descFont.GetPointSize() - 1);
    pDescOpenCV->SetFont(descFont);
    buttonSizer->Add(pDescOpenCV, 0, wxLEFT | wxRIGHT | wxBOTTOM, 10);

    m_pBtnFFMPEG = new wxButton(this, ID_BTN_FFMPEG,
        wxT("Open Video (FFMPEG)"),
        wxDefaultPosition, wxSize(300, 40));
    buttonSizer->Add(m_pBtnFFMPEG, 0, wxALL | wxEXPAND, 5);

    wxStaticText* pDescFFMPEG = new wxStaticText(this, wxID_ANY,
        wxT("Use FFMPEG library for video decoding (supports HW acceleration)"));
    pDescFFMPEG->SetFont(descFont);
    buttonSizer->Add(pDescFFMPEG, 0, wxLEFT | wxRIGHT | wxBOTTOM, 10);

    m_pBtnReopen = new wxButton(this, ID_BTN_REOPEN,
        wxT("Reopen Video"),
        wxDefaultPosition, wxSize(300, 40));
    buttonSizer->Add(m_pBtnReopen, 0, wxALL | wxEXPAND, 5);

    wxStaticText* pDescReopen = new wxStaticText(this, wxID_ANY,
        wxT("Reopen the last opened video file"));
    pDescReopen->SetFont(descFont);
    buttonSizer->Add(pDescReopen, 0, wxLEFT | wxRIGHT | wxBOTTOM, 10);

    m_pBtnOpenPrevious = new wxButton(this, ID_BTN_OPEN_PREVIOUS,
        wxT("Open Or Continue Previous Video"),
        wxDefaultPosition, wxSize(300, 40));
    buttonSizer->Add(m_pBtnOpenPrevious, 0, wxALL | wxEXPAND, 5);

    wxStaticText* pDescPrevious = new wxStaticText(this, wxID_ANY,
        wxT("Continue working with previously opened video"));
    pDescPrevious->SetFont(descFont);
    buttonSizer->Add(pDescPrevious, 0, wxLEFT | wxRIGHT | wxBOTTOM, 10);

    mainSizer->Add(buttonSizer, 1, wxALL | wxALIGN_CENTER_HORIZONTAL, 10);

    // Add Cancel button
    m_pBtnCancel = new wxButton(this, ID_BTN_CANCEL_DIALOG, wxT("Cancel"));
    mainSizer->Add(m_pBtnCancel, 0, wxALL | wxALIGN_CENTER_HORIZONTAL, 10);

    SetSizer(mainSizer);
    Centre();
}

COpenVideoDialog::~COpenVideoDialog()
{
}

void COpenVideoDialog::OnOpenCV(wxCommandEvent& event)
{
    m_selectedMethod = METHOD_OPENCV;
    EndModal(wxID_OK);
}

void COpenVideoDialog::OnFFMPEG(wxCommandEvent& event)
{
    m_selectedMethod = METHOD_FFMPEG;
    EndModal(wxID_OK);
}

void COpenVideoDialog::OnReopen(wxCommandEvent& event)
{
    m_selectedMethod = METHOD_REOPEN;
    EndModal(wxID_OK);
}

void COpenVideoDialog::OnOpenPrevious(wxCommandEvent& event)
{
    m_selectedMethod = METHOD_OPEN_PREVIOUS;
    EndModal(wxID_OK);
}

void COpenVideoDialog::OnCancel(wxCommandEvent& event)
{
    m_selectedMethod = METHOD_CANCEL;
    EndModal(wxID_CANCEL);
}

void COpenVideoDialog::OnClose(wxCloseEvent& event)
{
    m_selectedMethod = METHOD_CANCEL;
    EndModal(wxID_CANCEL);
}
