import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Button, ButtonGroup, Card, CardHeader, Dialog, DialogContent, DialogTitle, Grid, TablePagination, Typography, CircularProgress, IconButton, Grow } from "@mui/material";
import AnimatedAlert from './AnimatedAlert';
import ConfirmDialog from './ConfirmDialog';
import { AddCircleOutline, Refresh, ArrowBack as ArrowBackIcon, CloudUpload as CloudUploadIcon, NoteAddOutlined as NoteAddOutlinedIcon } from '@mui/icons-material';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import JumboSearch from "@jumbo/components/JumboSearch";
import Div from "@jumbo/shared/Div";
import useCRUD from "../hooks/useCRUD";
import { useNavigate } from "react-router-dom";

const ListCard = ({
  heading, single, url, EachItem, ShowForm, navigateto, slim,
  onDepartmentClick, highlightedItemId, onFormToggle, allDepartments, departmentFilterId, onViewStudents
}) => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success', animation: 'grow' });
  const [items, setItems] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null, title: '', message: '' });
  const [uploadMode, setUploadMode] = useState('add');
  const [selectedDepartmentForUpload, setSelectedDepartmentForUpload] = useState(null);
  const navigate = useNavigate();
  const { read, getItem, createItem, updateItem, deleteItem, bulkCreateItems } = useCRUD();
  const fileInputRef = useRef(null);
  const API_URL = process.env.REACT_APP_CRUD_API_URL || 'http://localhost:8000/api';

  const handleOnChange = useCallback((keywords) => {
    setSearch(keywords);
    setPage(0);
  }, []);

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line
  }, [page, rowsPerPage, refresh, departmentFilterId, search]);

  const showMessage = (message) => {
    setSnackbar({
      open: true,
      message: message,
      severity: 'error',
    });
    setLoading(false);
  };

  const fetchItems = async () => {
    setLoading(true);
    let searchParams = {};
    if (search) searchParams.search = search;
    if (departmentFilterId && url === 'students') searchParams.department = departmentFilterId;
    try {
      const axios = require('axios');
      const requestParams = {
        page: page + 1,
        limit: rowsPerPage,
        ...searchParams
      };
      const response = await axios.get(`${API_URL}/${url}/`, { params: requestParams });
      const data = response.data;
      if (data && data.results) {
        setItems(data.results);
        setTotalItems(data.count || data.results.length);
      } else if (data && Array.isArray(data)) {
        setItems(data);
        setTotalItems(data.length);
      } else {
        setItems([]);
        setTotalItems(0);
      }
    } catch (error) {
      showMessage(error.message || `Failed to fetch ${url}`);
      setItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRefresh = () => {
    page === 0 ? setRefresh(refresh + 1) : setPage(0);
    setSearch('');
  };

  const handleAdd = async (data, setErrors, setSubmitting) => {
    try {
      if (typeof setSubmitting === 'function') setSubmitting(true);
      const axios = require('axios');
      const response = await axios.post(`${API_URL}/${url}/`, data);
      setSnackbar({ open: true, message: `${single} added successfully`, severity: 'success', animation: 'grow' });
      setOpen(false);
      await fetchItems();
      return response.data;
    } catch (error) {
      if (error?.response?.data) {
        if (typeof setErrors === 'function') setErrors(error.response.data);
        const errorMessage = error.response.data.detail || error.response.data.error || Object.values(error.response.data).flat().join('\n') || `Failed to add ${single}`;
        setSnackbar({ open: true, message: errorMessage, severity: 'error', animation: 'slide' });
      } else {
        setSnackbar({ open: true, message: error.message || `Failed to add ${single}`, severity: 'error', animation: 'slide' });
      }
      throw error;
    } finally {
      if (typeof setSubmitting === 'function') setSubmitting(false);
    }
  };

  const handleEdit = async (id, data, setErrors, setSubmitting) => {
    try {
      if (typeof setSubmitting === 'function') setSubmitting(true);
      const axios = require('axios');
      const response = await axios.put(`${API_URL}/${url}/${id}/`, data);
      setSnackbar({ open: true, message: `${single} updated successfully`, severity: 'success', animation: 'grow' });
      setOpen(false);
      await fetchItems();
      return response.data;
    } catch (error) {
      if (error?.response?.data) {
        if (typeof setErrors === 'function') setErrors(error.response.data);
        const errorMessage = error.response.data.detail || error.response.data.error || Object.values(error.response.data).flat().join('\n') || `Failed to update ${single}`;
        setSnackbar({ open: true, message: errorMessage, severity: 'error', animation: 'slide' });
      } else {
        setSnackbar({ open: true, message: error.message || `Failed to update ${single}`, severity: 'error', animation: 'slide' });
      }
      throw error;
    } finally {
      if (typeof setSubmitting === 'function') setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      open: true,
      id: id,
      title: `Delete ${single}`,
      message: `Are you sure you want to delete this ${single}? This action cannot be undone.`,
      onConfirm: () => confirmDelete(id)
    });
  };

  const confirmDelete = (id) => {
    const axios = require('axios');
    axios.delete(`${API_URL}/${url}/${id}/`)
      .then(() => {
        setSnackbar({ open: true, message: `${heading} deleted successfully`, severity: 'success', animation: 'grow' });
        fetchItems();
      })
      .catch(error => {
        setSnackbar({ open: true, message: error.message || `Failed to delete ${single}`, severity: 'error', animation: 'slide' });
      })
      .finally(() => {
        setConfirmDialog({ ...confirmDialog, open: false });
      });
  };

  const cancelDelete = () => {
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  const handleEditForm = async (id) => {
    try {
      const axios = require('axios');
      const response = await axios.get(`${API_URL}/${url}/${id}/`);
      handleShowForm(response.data);
    } catch (error) {
      showMessage(error.message || `Failed to fetch ${single} for editing`);
    }
  };

  const handleShowForm = (data) => {
    setValues(data);
    if (navigateto) {
      navigate(navigateto, { state: { values: data } });
    } else {
      setOpen(true);
    }
  };

  const handleBulkUploadClick = (mode, departmentId) => {
    setUploadMode(mode || 'add');
    setSelectedDepartmentForUpload(departmentId);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let jsonData = [];
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          const csvData = Papa.parse(e.target.result, { header: true, skipEmptyLines: true });
          jsonData = csvData.data;
        } else if (
          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.name.endsWith('.xlsx') ||
          file.type === 'application/vnd.ms-excel' ||
          file.name.endsWith('.xls')
        ) {
          const workbook = XLSX.read(e.target.result, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          setLoading(true);
          const formData = new FormData();
          formData.append('file', file);
          formData.append('mode', uploadMode);
          const axios = require('axios');
          axios.post(`${API_URL}/departments/pdf-upload/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
            .then(response => {
              setSnackbar({ open: true, message: response.data.message || `${response.data.processed_count || 0} departments processed from PDF.`, severity: 'success', animation: 'grow' });
              handleRefresh();
            })
            .catch(error => {
              const errorMsg = error?.response?.data?.detail || error?.response?.data?.error || error?.response?.data?.message || error.message || 'Failed to process PDF file.';
              setSnackbar({ open: true, message: `PDF processing failed: ${errorMsg}`, severity: 'error', animation: 'slide' });
            })
            .finally(() => {
              setLoading(false);
              if (fileInputRef.current) fileInputRef.current.value = null;
            });
          return;
        } else {
          setSnackbar({ open: true, message: 'Unsupported file type. Please upload CSV, Excel, or PDF.', severity: 'error', animation: 'slide' });
          if (fileInputRef.current) fileInputRef.current.value = null;
          return;
        }
        if (url === 'students') {
          if (!allDepartments || !Array.isArray(allDepartments) || allDepartments.length === 0) {
            setSnackbar({ open: true, message: 'Department data not loaded. Cannot process student departments from file.', severity: 'error' });
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = null;
            return;
          }
          const departmentNameMap = {};
          allDepartments.forEach(dept => {
            departmentNameMap[dept.name.toLowerCase().trim()] = dept.id;
          });
          const processedStudents = jsonData.map(studentFromFile => {
            const standardizedStudent = {};
            for (const key in studentFromFile) {
              standardizedStudent[key.toLowerCase().replace(/\s+/g, '')] = studentFromFile[key];
            }
            const departmentField = standardizedStudent.departments || standardizedStudent.department || '';
            const groupIds = departmentField.toString().split(',')
              .map(name => name.trim().toLowerCase())
              .filter(name => departmentNameMap[name])
              .map(name => departmentNameMap[name]);
            return {
              email: standardizedStudent.email,
              first_name: standardizedStudent.firstname || standardizedStudent.first_name,
              last_name: standardizedStudent.lastname || standardizedStudent.last_name,
              mobile: standardizedStudent.mobile,
              groups: groupIds.length > 0 ? groupIds : [],
            };
          }).filter(student => student.email && student.first_name && student.last_name);
          if (processedStudents.length > 0) {
            const axios = require('axios');
            axios.post(`${API_URL}/students/bulk-add/`, processedStudents)
              .then(response => {
                setSnackbar({ open: true, message: response.data.message || `${response.data.created_count || processedStudents.length} students processed.`, severity: 'success' });
                handleRefresh();
              })
              .catch(error => {
                const errorMsg = error?.response?.data?.detail || error?.response?.data?.error || error?.response?.data?.message || error.message || 'Failed to bulk add students.';
                setSnackbar({ open: true, message: `Bulk add failed: ${errorMsg}`, severity: 'error' });
              });
          } else {
            setSnackbar({ open: true, message: 'No valid student data (with email, first name, last name) found in the file to process, or department names did not match.', severity: 'warning' });
          }
        } else if (url === 'departments') {
          const processedDepartments = jsonData.map(deptFromFile => {
            const standardizedDept = {};
            for (const key in deptFromFile) {
              standardizedDept[key.toLowerCase().replace(/\s+/g, '').replace(/_/g, '')] = deptFromFile[key];
            }
            return {
              name: standardizedDept.name || standardizedDept.departmentname,
              description: standardizedDept.description || '',
            };
          }).filter(dept => dept.name);
          if (processedDepartments.length > 0) {
            const axios = require('axios');
            const endpoint = uploadMode === 'update' ? 'bulk-update' : 'bulk-add';
            axios.post(`${API_URL}/departments/${endpoint}/`, processedDepartments)
              .then(response => {
                setSnackbar({ open: true, message: response.data.message || `${response.data.created_count || processedDepartments.length} departments processed.`, severity: 'success' });
                handleRefresh();
              })
              .catch(error => {
                const errorMsg = error?.response?.data?.detail || error?.response?.data?.error || error?.response?.data?.message || error.message || 'Failed to bulk add departments.';
                setSnackbar({ open: true, message: `Bulk add failed: ${errorMsg}`, severity: 'error' });
              });
          } else {
            setSnackbar({ open: true, message: 'No valid department data (with a name column) found in the file to process.', severity: 'warning' });
          }
        } else {
          setSnackbar({ open: true, message: `Bulk upload is not configured for '${single || heading}'.`, severity: 'info' });
        }
      } catch (error) {
        setSnackbar({ open: true, message: `Error parsing file: ${error.message}`, severity: 'error' });
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = null;
      }
    };
    reader.onerror = (error) => {
      setSnackbar({ open: true, message: 'Error reading file.', severity: 'error' });
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = null;
    };
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.name.endsWith('.xlsx') ||
      file.type === 'application/vnd.ms-excel' ||
      file.name.endsWith('.xls')
    ) {
      reader.readAsBinaryString(file);
    } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      // handled above
    } else {
      setSnackbar({ open: true, message: 'Unsupported file type. Please upload CSV, Excel, or PDF.', severity: 'error', animation: 'slide' });
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  return (
    <Grid container spacing={3.75}>
      <Grid item xs={12} sm={12} lg={12}>
        <Typography variant={"h3"} mb={2} color={"text.dark"}>{heading}</Typography>
        {/* Form Dialog */}
        <Dialog fullWidth={true} maxWidth="md" open={open} onClose={() => setOpen(false)}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => setOpen(false)} aria-label="close dialog" sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            {heading}
          </DialogTitle>
          <DialogContent>
            {ShowForm && (
              <ShowForm
                onHideDialog={() => setOpen(false)}
                onAdd={handleAdd}
                onEdit={handleEdit}
                editValues={values}
                initialDepartmentId={departmentFilterId && url === 'students' ? departmentFilterId : null}
              />
            )}
          </DialogContent>
        </Dialog>
        <Card sx={{ mb: 2 }}>
          <CardHeader
            title={
              <Div sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>{heading}</Typography>
              </Div>
            }
            action={
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mr: 0.5 }}>
                  {!slim && (
                    <IconButton onClick={handleRefresh} title={`Refresh ${single ? single + 's' : 'list'}`} size="small">
                      <Refresh />
                    </IconButton>
                  )}
                  {ShowForm && (
                    <IconButton
                      onClick={() => {
                        if (navigateto) {
                          navigate(navigateto);
                        } else {
                          setValues({});
                          setOpen(true);
                        }
                      }}
                      title={`Add New ${single || 'Item'}`}
                      size="small"
                    >
                      <AddCircleOutline />
                    </IconButton>
                  )}
                  {(url === 'students' || url === 'departments') && !slim && (
                    <IconButton
                      onClick={() => fileInputRef.current.click()}
                      title={`Bulk Upload ${url === 'students' ? 'Students' : 'Groups'}`}
                      size="small"
                    >
                      <CloudUploadIcon />
                    </IconButton>
                  )}
                  {!slim && (
                    <JumboSearch
                      onChange={handleOnChange}
                      value={search}
                      sx={{ width: { xs: '120px', sm: '180px', md: '230px' } }}
                    />
                  )}
                </Box>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileSelected}
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/pdf"
                />
                <TablePagination component="div" count={totalItems} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={slim ? [5] : [2, 10, 25, 50, 100, 1000]} />
              </>
            }
          />
          {/* Content of the card: Loading indicator, list of items, or empty state */}
          {loading && items.length === 0 ? (
            <Div sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', my: 5 }}>
              <CircularProgress />
            </Div>
          ) : items.length > 0 ? (
            items.map((item, index) => {
              const Component = EachItem;
              return (
                <Grow in={true} timeout={300 + index * 50} key={item.id || index} mountOnEnter unmountOnExit>
                  <Div sx={{ p: 2, borderBottom: '1px solid #eee' }}>
                    <Component
                      item={item}
                      onEdit={() => handleEditForm(item.id)}
                      onDelete={() => handleDelete(item.id)}
                      onDepartmentClick={onDepartmentClick}
                      highlightedItemId={highlightedItemId}
                      allDepartments={allDepartments}
                      onViewStudents={onViewStudents}
                      onBulkUpload={handleBulkUploadClick}
                      onRemoveStudents={onViewStudents}
                    />
                  </Div>
                </Grow>
              );
            })
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3, m: 2, borderRadius: '8px', border: '1px dashed #ccc', minHeight: 250 }}>
              <NoteAddOutlinedIcon sx={{ fontSize: '3.5rem', color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.primary" gutterBottom>
                No {single ? single + 's' : 'items'} found yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, textAlign: 'center', maxWidth: 380 }}>
                It seems there are no {single ? single + 's' : 'items'} here. Why not add the first one?
              </Typography>
              {(navigateto || (ShowForm && typeof setOpen === 'function')) && (
                <Button
                  variant="contained"
                  startIcon={<AddCircleOutline />}
                  onClick={() => {
                    if (navigateto) {
                      navigate(navigateto);
                    } else if (ShowForm && typeof setOpen === 'function') {
                      setValues({});
                      setOpen(true);
                    }
                  }}
                >
                  Add New {single}
                </Button>
              )}
            </Box>
          )}
        </Card>
        <AnimatedAlert
          open={snackbar.open}
          message={snackbar.message}
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          duration={4000}
          position="top-right"
          animation={snackbar.animation || 'grow'}
        />
        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm || confirmDelete}
          onCancel={cancelDelete}
          confirmText="Delete"
          cancelText="Cancel"
          confirmColor="error"
        />
      </Grid>
    </Grid>
  );
};

export default ListCard;
